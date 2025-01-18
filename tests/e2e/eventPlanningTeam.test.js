require('dotenv').config({ path: './.env.local' });
const fs = require('fs');
const path = require('path');

// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

const openAITeam = require('./examples/teams/event_planning/openai');
const openAITeamRecordedRequests = require('./examples/teams/event_planning/openai.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

//   record({
//     url: '*',
//     method: '*',
//     body: '*'  // Record any POST request to this URL
// });

describe('OpenAI Team Workflows', () => {
  describe('Using Standard OpenAI Agents', () => {
    beforeEach(() => {
      // Mocking all POST requests with a callback
      if (withMockedApis) {
        mock(openAITeamRecordedRequests);
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('completes the entire workflow successfully', async () => {
      const { team, tasks } = openAITeam;
      await team.start();
      let storeFinalState = team.useStore().getState().getCleanedState();

      const snapshotName = `eventPlanningTeam.test.json`;
      const snapshotDir = path.join(process.cwd(), `tests/e2e/__snapshots__`);
      const snapshotPath = path.join(snapshotDir, snapshotName);

      const storeFinalStateStr = JSON.stringify(storeFinalState, null, 2);

      let snapshotContent = storeFinalStateStr;
      if (!fs.existsSync(snapshotPath)) {
        console.log('Creating snapshot file');
        // ensure the directory exists
        fs.mkdirSync(snapshotDir, { recursive: true });

        // Save state to JSON file
        fs.writeFileSync(snapshotPath, storeFinalStateStr);
      } else {
        snapshotContent = fs.readFileSync(snapshotPath, 'utf8');
      }

      // Parse the snapshot content into an object for comparison
      let snapshotContentObj = JSON.parse(snapshotContent);

      // Create mapping of task names to IDs from the tasks array
      const taskNameToId = tasks.reduce(
        (acc, task) => ({
          ...acc,
          [task.description]: task.id,
        }),
        {}
      );

      // Helper function to replace task IDs in a state object
      const replaceTaskIds = (state) => {
        // Replace task IDs in tasks array
        state.tasks = state.tasks.map((task) => ({
          ...task,
          id: taskNameToId[task.description] || task.id,
          dependencies: task.dependencies?.map((depId) => {
            // Find task with this ID and get its description
            const depTask = tasks.find((t) => t.id === depId);
            return depTask ? taskNameToId[depTask.description] : depId;
          }),
        }));

        // Replace task IDs in workflow logs
        state.workflowLogs = state.workflowLogs.map((log) => ({
          ...log,
          task: log.task
            ? {
                ...log.task,
                id: taskNameToId[log.task.description] || log.task.id,
                dependencies: log.task.dependencies?.map((depId) => {
                  const depTask = tasks.find((t) => t.id === depId);
                  return depTask ? taskNameToId[depTask.description] : depId;
                }),
              }
            : log.task,
        }));

        return state;
      };

      // Replace IDs in both current state and snapshot
      storeFinalState = replaceTaskIds(storeFinalState);
      snapshotContentObj = replaceTaskIds(snapshotContentObj);

      // Verify key properties match between current state and snapshot
      expect(storeFinalState.teamWorkflowStatus).toEqual(
        snapshotContentObj.teamWorkflowStatus
      );
      expect(storeFinalState.workflowResult).toEqual(
        snapshotContentObj.workflowResult
      );
      expect(storeFinalState.name).toEqual(snapshotContentObj.name);
      expect(storeFinalState.inputs).toEqual(snapshotContentObj.inputs);
      expect(storeFinalState.workflowContext).toEqual(
        snapshotContentObj.workflowContext
      );
      expect(storeFinalState.logLevel).toEqual(snapshotContentObj.logLevel);

      // Verify workflow logs have same length
      expect(storeFinalState.workflowLogs.length).toEqual(
        snapshotContentObj.workflowLogs.length
      );

      // Verify all logs exist in both states regardless of order
      const logsExistInBoth = storeFinalState.workflowLogs.every((currentLog) =>
        snapshotContentObj.workflowLogs.some(
          (snapshotLog) =>
            JSON.stringify(currentLog) === JSON.stringify(snapshotLog)
        )
      );
      expect(logsExistInBoth).toBe(true);

      // Helper function to get parent tasks recursively
      const getParentTasks = (task, allTasks) => {
        const parentTasks = new Set();
        if (!task.dependencies) return parentTasks;

        task.dependencies.forEach((depId) => {
          const parentTask = allTasks.find((t) => t.id === depId);
          if (parentTask) {
            parentTasks.add(parentTask);
            for (const parent of getParentTasks(parentTask, allTasks)) {
              parentTasks.add(parent);
            }
          }
        });
        return Array.from(parentTasks);
      };

      // Verify task dependencies are completed
      storeFinalState.tasks.forEach((task) => {
        const parentTasks = getParentTasks(task, storeFinalState.tasks);

        // Find index where current task is marked as DONE
        const currentTaskDoneIndex = storeFinalState.workflowLogs.findIndex(
          (log) =>
            log.logType === 'TaskStatusUpdate' &&
            log.taskStatus === 'DONE' &&
            log.task.id === task.id
        );

        expect(currentTaskDoneIndex).not.toBe(-1);

        // console.log(task.id, currentTaskDoneIndex, parentTasks.map(p => p.id));

        parentTasks.forEach((parentTask) => {
          const parentTaskDoneIndex = storeFinalState.workflowLogs.findIndex(
            (log) =>
              log.logType === 'TaskStatusUpdate' &&
              log.taskStatus === 'DONE' &&
              log.task.id === parentTask.id
          );

          expect(parentTaskDoneIndex).toBeLessThan(currentTaskDoneIndex);
        });
      });

      // expect(storeFinalState).toMatchSnapshot();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();
    });
  });
});
