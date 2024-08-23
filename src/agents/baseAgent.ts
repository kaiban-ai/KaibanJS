/**
 * Base Agent Definition.
 *
 * This file defines the BaseAgent class, which serves as the foundational component for all agents within the library.
 * It includes fundamental methods for setting environment variables, managing agent status, and abstract methods
 * for task execution which must be implemented by subclasses to handle specific tasks.
 *
 * Usage:
 * Extend this class to create specialized agents with specific behaviors suited to different types of tasks and workflows.
 */

import { v4 as uuidv4 } from "uuid";
import { ENUM_AGENT_STATUS } from "../utils/enums";
import { ILLMConfig, TEnv } from "../utils/types";

/**
 * --- Base Agent Parameters ---
 *
 * name: A descriptive or friendly identifier for easier recognition of the agent.
 *
 * role: Defines the agent's function within the team, determining the kind of tasks it is best suited for.
 *
 * goal: Specifies the individual objective the agent aims to achieve, guiding its decision-making process.
 *
 * background: Provides context that enriches the agent's role and goal, enhancing interaction and collaboration dynamics.
 *
 * tools: A set of capabilities or functions the agent can use, initialized with a default empty list.
 *
 * llmconfig: Configures the underlying language model used by the agent.
 *
 * maxIterations: Specifies the maximum number of iterations the agent is allowed to perform before stopping, controlling execution length and preventing infinite loops. Defaults to 10.
 *
 * forceFinalAnswer: Controls whether the agent should deliver a final answer as it approaches the maximum number of allowed iterations. This is useful in scenarios where the agent has a satisfactory answer but might otherwise continue refining it. Defaults to true.
 *
 * ------------------------------
 */
export interface IBaseAgentParams {
  name: string;
  role: string;
  goal: string;
  background: string;
  tools?: any[];
  llmConfig?: ILLMConfig;
  maxIterations?: number;
  forceFinalAnswer: boolean;
}

/**
 * --- Base Agent ---
 *
 * The BaseAgent class serves as the foundational component for all agents within the library.
 * It includes fundamental methods for setting environment variables, managing agent status, and abstract methods
 * for task execution which must be implemented by subclasses to handle specific tasks.
 *
 * Usage:
 * Extend this class to create specialized agents with specific behaviors suited to different types of tasks and workflows.
 */
class BaseAgent {
  id: string;
  store: any = null;
  status: ENUM_AGENT_STATUS;
  env: TEnv = null;
  llmSystemMessage: any = null;

  name: string;
  role: string;
  goal: string;
  background: string;
  tools: any[];
  llmConfig: ILLMConfig;
  maxIterations: number;
  forceFinalAnswer: boolean;

  constructor(params: IBaseAgentParams) {
    // Set the params
    this.name = params.name;
    this.role = params.role;
    this.goal = params.goal;
    this.background = params.background;
    this.tools = params.tools;
    this.llmConfig = {
      provider: "openai",
      model: "gpt-4o-mini",
      maxRetries: 1,
      ...(params.llmConfig ?? {}),
    };
    this.maxIterations = params.maxIterations ?? 10;
    this.forceFinalAnswer = params.forceFinalAnswer ?? true;

    // Initialize the agent
    this.id = uuidv4();
    this.status = ENUM_AGENT_STATUS.INITIAL;
  }

  // TODO: Missing context for store type
  setStore = (store) => {
    this.store = store;
  };

  setStatus = (status: ENUM_AGENT_STATUS) => {
    this.status = status;
  };

  setEnv = (env: TEnv) => {
    this.env = env;
  };
}

export { BaseAgent };
