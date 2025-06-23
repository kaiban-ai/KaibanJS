import { z } from 'zod';
import type { Step, StepContext, WorkflowConfig } from './types';
import { Workflow } from './workflow';

// Helper function to create a new step
export const createStep = <TInput, TOutput>(config: {
  id: string;
  description?: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  resumeSchema?: z.ZodType;
  suspendSchema?: z.ZodType;
  execute: (context: StepContext<TInput, TOutput>) => Promise<TOutput>;
}): Step<TInput, TOutput> => {
  return {
    id: config.id,
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    resumeSchema: config.resumeSchema,
    suspendSchema: config.suspendSchema,
    execute: config.execute,
  };
};
export const createWorkflow = <
  TInput,
  TOutput,
  TSteps extends Record<string, Step<any, any>>
>(
  config: WorkflowConfig<TInput, TOutput, TSteps>
): Workflow<TInput, TOutput, TSteps> => {
  return new Workflow(config);
};
