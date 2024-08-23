// -------------------------------------------------------------------------
// Welcome to the sketchbook of our library's type definitions.
//--------------------------------------------------------------------------
//
// Like a promise of "we'll do it tomorrow," we've sketched out the outlines but the details?
// Well, they will be defined later... This finger never eats but always says 'I'll pick the tab next time!'
//
// Feel adventurous? Help us fill in the gaps – don't wait for tomorrow!
// -------------------------------------------------------------------------

import { Tool } from "langchain/tools";
import type { AGENT_STATUS_enum, TASK_STATUS_enum } from "./enums.d.ts";
import type {
  BaseAgent,
  IBaseAgentParams,
  ILLMConfig,
  ITaskStats,
  TAgentTypes,
  TStore,
} from "./types.d.ts";

declare module "agenticjs" {
  export class Agent {
    agentInstance: BaseAgent;
    type: string;

    constructor(type: TAgentTypes, config: IBaseAgentParams);

    createAgent(type: TAgentTypes, config: IBaseAgentParams): BaseAgent;
    executeTask(task: Task): Promise<any>;

    setStore(store: TStore): void;
    setEnv(env: Record<string, any>): void;
    setStatus(status: AGENT_STATUS_enum): void;

    id(): string;
    name(): string;
    role(): string;
    goal(): string;
    background(): string;
    tools(): Tool[];
    status(): AGENT_STATUS_enum;
    llmConfig(): ILLMConfig;
    llmSystemMessage(): string;
    forceFinalAnswer(): boolean;
  }

  export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: any;
    agent: BaseAgent;
    isDeliverable?: boolean;
  }

  export class Task {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    isDeliverable: boolean;
    agent: BaseAgent;
    status: TASK_STATUS_enum;
    result: any; // ? Need more context
    stats: ITaskStats | null;
    duration: number | null;
    dependencies: Task[];
    interpolatedTaskDescription: string | null;
    store: TStore;

    constructor(params: ITaskParams);

    setStore(store: TStore): void;
  }

  export interface ITeamParams {
    name: string;
    agents?: BaseAgent[];
    tasks?: Task[];
    logLevel?: string;
    inputs?: Record<string, string>;
    env?: Record<string, any> | null;
  }

  export class Team {
    store: TStore;

    constructor(params: ITeamParams);

    start(): Promise<void>;
    getStore(): TStore;
    useStore(): TStore;
    subscribeToChanges(
      listener: (store: TStore) => void, // ? Need more context
      properties?: string[]
    ): () => void;
  }
}
