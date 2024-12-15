/**
 * @file taskFeedbackTypes.ts
 * @path KaibanJS/src/types/task/taskFeedbackTypes.ts
 * @description Task feedback type definitions
 *
 * @module types/task
 */

import { FEEDBACK_STATUS_enum } from '../common/commonEnums';

/**
 * Task feedback interface
 */
export interface ITaskFeedback {
    id: string;
    content: string;
    status: keyof typeof FEEDBACK_STATUS_enum;
    timestamp: Date;
    userId: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    assignedTo?: string;
}

/**
 * Type guards
 */
export const TaskFeedbackTypeGuards = {
    /**
     * Check if value is TaskFeedback
     */
    isTaskFeedback: (value: unknown): value is ITaskFeedback => {
        if (typeof value !== 'object' || value === null) return false;
        const feedback = value as Partial<ITaskFeedback>;
        return (
            typeof feedback.id === 'string' &&
            typeof feedback.content === 'string' &&
            'status' in feedback &&
            feedback.timestamp instanceof Date &&
            typeof feedback.userId === 'string'
        );
    }
};
