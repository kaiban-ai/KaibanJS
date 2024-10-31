/**
 * @file index.ts
 * @path src/types/team/index.ts
 * @description Central export point for all team-related types
 *
 * @packageDocumentation
 * @module @types/team
 */

import { TASK_STATUS_enum } from '@/utils/core/enums';
import { logger } from '@/utils/core/logger';
import type { TeamState } from './base';
import type { Log } from './logs';
import type { TaskType } from '../task/base';

// Re-export base team types
export * from './base';

// Re-export logging types
export * from './logs';

/**
 * Utility functions for team management and validation
 */
export const TeamUtils = {
    /**
     * Check if team is ready to start
     * @param team - Team state to check
     * @returns boolean indicating if team is ready
     */
    isTeamReady: (team: TeamState): boolean => {
        logger.debug('Checking team readiness');
        return (
            team.agents.length > 0 &&
            team.tasks.length > 0 &&
            team.tasksInitialized
        );
    },

    /**
     * Check if team has completed all tasks
     * @param team - Team state to check
     * @returns boolean indicating if all tasks are complete
     */
    hasCompletedAllTasks: (team: TeamState): boolean => {
        return team.tasks.every((task: TaskType) => 
            task.status === TASK_STATUS_enum.DONE || 
            task.status === TASK_STATUS_enum.VALIDATED
        );
    },

    /**
     * Get team completion percentage
     * @param team - Team state to calculate completion for
     * @returns number representing completion percentage
     */
    getTeamCompletion: (team: TeamState): number => {
        const completedTasks = team.tasks.filter(
            (task: TaskType) => 
                task.status === TASK_STATUS_enum.DONE || 
                task.status === TASK_STATUS_enum.VALIDATED
        ).length;
        return (completedTasks / team.tasks.length) * 100;
    },

    /**
     * Create team context from logs
     * @param team - Team state to create context from
     * @returns string representing team context
     */
    createTeamContext: (team: TeamState): string => {
        logger.debug('Creating team context from logs');
        return team.workflowLogs
            .filter((log: Log) => 
                log.logType === 'TaskStatusUpdate' && 
                log.taskStatus === TASK_STATUS_enum.DONE
            )
            .map((log: Log) => `${log.taskTitle}: ${log.metadata.result || 'Completed'}`)
            .join('\n');
    }
};