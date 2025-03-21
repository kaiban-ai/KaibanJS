import { WORKFLOW_ACTION_enum } from '../utils/enums';

export interface WorkflowLoopStoreVariables {
  activePromises: Map<string, Set<PromiseObject>>;
}

export interface PromiseObject {
  promise: Promise<unknown>;
  reject: (error: Error) => void;
}

export interface WorkflowLoopStoreVariables {
  activePromises: Map<string, Set<PromiseObject>>;
}

export interface WorkflowLoopStoreActions {
  trackPromise: (agentId: string, promiseObj: PromiseObject) => void;
  removePromise: (agentId: string, promiseObj: PromiseObject) => void;
  abortAgentPromises: (agentId: string, action: WORKFLOW_ACTION_enum) => void;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: () => Promise<void>;
  stopWorkflow: () => Promise<void>;
}

export type WorkflowLoopState = WorkflowLoopStoreVariables &
  WorkflowLoopStoreActions;
