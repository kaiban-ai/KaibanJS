// Assuming agenticjs is a local module or a placeholder for demonstration purposes
// This file is now a typescript file and all the types are included in the module
import { Agent, Task, Team } from "agenticjs/bundle.js";
import type { IAgentParams, ITaskParams } from "agenticjs/bundle.js";
import * as dotenv from "dotenv";

dotenv.config({ path: "./.env.local" });

const main = async () => {
  // ╔══════════════════════════════════════════════════════╗
  // ║ How to Use AgenticJS:                                ║
  // ║ 1. Define your Agents with specific roles and goals  ║
  // ║ 2. Define the Tasks each Agent will perform          ║
  // ║ 3. Create the Team and assign Agents and their Tasks ║
  // ║ 4. Start the Team to execute the defined tasks       ║
  // ╚══════════════════════════════════════════════════════╝

  // ──── Agents ────────────────────────────────────────────
  // ─ Agents are autonomous entities designed to perform
  // ─ specific roles and achieve goals based on the
  // ─ tasks assigned to them.
  // ────────────────────────────────────────────────────────

  // We create an list of different agents based on our needs.
  const AgentParams: Record<string, IAgentParams> = {
    profileAnalyst: {
      name: "Ivy",
      role: "Profile Analyst",
      goal: "Extract structured information from conversational user input.",
      background: "Data Processor",
      tools: [], // Tools are omitted for now
    },
    formatter: {
      name: "Formy",
      role: "Formatter",
      goal: "Format structured information into a professional resume.",
      background: "Document Formatter",
      tools: [],
    },
    reviewer: {
      name: "Revy",
      role: "Reviewer",
      goal: "Review and polish the final resume.",
      background: "Quality Assurance Specialist",
      tools: [],
    },
  };

  // Now we can create a new agent class instance using each of the agent params
  const profileAnalyst: Agent = new Agent(AgentParams.profileAnalyst);
  const formatter: Agent = new Agent(AgentParams.formatter);
  const reviewer: Agent = new Agent(AgentParams.reviewer);

  // ──── Tasks ─────────────────────────────────────────────
  // ─ Tasks define the specific actions each agent must
  // ─ take, their expected outputs, and mark critical
  // ─ outputs as deliverables if they are the final
  // ─ products.
  // ────────────────────────────────────────────────────────

  // We create a list of different tasks that we would like to perform
  const taskParams: Record<string, ITaskParams> = {
    processing: {
      title: "Process User Input",
      description: `Extract relevant details such as name, experience, skills, and job history from the user's 'aboutMe' input. 
      aboutMe: {aboutMe}`,
      expectedOutput: "Structured data ready for formatting.",
      agent: profileAnalyst,
    },
    formatting: {
      title: "Format Resume",
      description: `Use the extracted information to create a clean, professional resume layout tailored for a JavaScript Developer.`,
      expectedOutput: "A well-formatted resume in PDF format.",
      agent: formatter,
    },
    review: {
      title: "Review Resume",
      description: `Ensure the resume is error-free, engaging, and meets professional standards.`,
      expectedOutput:
        "A polished, final resume ready for job applications. Please do not give any feedback on the resume. Just the final resume.",
      agent: reviewer,
    },
  };

  // Now we can create a new task class instance using each of the task params
  const processingTask: Task = new Task(taskParams.processing);
  const formattingTask: Task = new Task(taskParams.formatting);
  const reviewTask: Task = new Task(taskParams.review);

  // ──── Team ────────────────────────────────────────────
  // ─ The Team coordinates the agents and their tasks.
  // ─ It starts with an initial input and manages the
  // ─ flow of information between tasks.
  // ──────────────────────────────────────────────────────

  const team: Team = new Team({
    name: "Resume Creation Team",
    agents: [profileAnalyst, formatter, reviewer],
    tasks: [processingTask, formattingTask, reviewTask],
    inputs: {
      aboutMe:
        "My name is Will, I have been a Javascript Developer for 3 years. I know React, NextJS, and REDUX. My latest job was as a Junior Developer at Disney creating UIs for the main landing page.",
    }, // Initial input for the first task
    env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
  });

  // ──── Listening to Changes────────────────────────────────────────────
  //
  // Listening to changes in the team's state is crucial for dynamic updates.
  // Yup...AgenticJS utilizes a store similar to Redux for state management.
  //
  // You can subscribe to specific fields or any field on the store.
  //──────────────────────────────────────────────────────────────────────

  const unsubscribe = team.subscribeToChanges(
    (updatedFields) => {
      console.log("Workflow Status Updated:", updatedFields);
    },
    ["teamWorkflowStatus"]
  );

  // ──── Start Team Workflow ───────────────────────────────────────
  //
  // Begins the predefined team process, producing the final result.
  // We unsubscribe from the store after we have completed the process.
  //─────────────────────────────────────────────────────────────────
  const result = await team.start();
  console.log("Final Output:", result);
  unsubscribe();
};

console.log("Starting AgenticJS Workflow...");

main();

console.log("AgenticJS Workflow Completed.");
