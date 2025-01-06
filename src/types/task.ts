import { ILLMUsageStats } from './llm';

/**
 * ### Task stats
 * @interface ITaskStats
 * @property {number} startTime - The start time of the task.
 * @property {number} endTime - The end time of the task.
 * @property {number} duration - The duration of the task.
 * @property {ILLMUsageStats} llmUsageStats - The LLM usage statistics.
 * @property {number} iterationCount - The iteration count.
 */
export interface ITaskStats {
  startTime: number;
  endTime: number;
  duration: number;
  llmUsageStats: ILLMUsageStats;
  iterationCount: number;
}
