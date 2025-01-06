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

import { Tool } from 'langchain/tools';
import { v4 as uuidv4 } from 'uuid';
import { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from '../utils/prompts';
import { ILLMConfig, INLLMConfig } from '../types/llm';
import { TStore } from '../types/store';
import { AGENT_STATUS_enum } from '../types/enums';
import { TPromptTemplates } from '../types/prompts';

/**
 * ### BaseAgent params
 * @interface IBaseAgentParams
 * @property {string} name - The name of the agent.
 * @property {string} role - The role of the agent.
 * @property {string} goal - The goal of the agent.
 * @property {string} background - The background of the agent.
 * @property {Tool[]} [tools] - The tools available to the agent.
 * @property {ILLMConfig} [llmConfig] - The language model configuration.
 * @property {number} [maxIterations] - The maximum number of iterations.
 * @property {boolean} [forceFinalAnswer] - Whether to force the final answer.
 * @property {boolean} [forceFinalAnswer] - Whether to force the final answer.
 */
export interface IBaseAgentParams {
  name: string;
  role: string;
  goal: string;
  background: string;
  tools?: Tool[];
  llmConfig?: INLLMConfig;
  maxIterations?: number;
  forceFinalAnswer?: boolean;
  promptTemplates?: TPromptTemplates;
  llmInstance?: any;
}

/**
 * ### BaseAgent
 * Used to reference the core BaseAgent class type.
 * @class
 * @property {string} id - The agent's unique identifier.
 * @property {TStore} store - The store used by the agent.
 * @property {AGENT_STATUS_enum} status - The agent's current status.
 * @property {Record<string, any> | null} env - The agent's environment variables.
 * @property {string} llmSystemMessage - The agent's system message.
 * @property {string} name - The agent's name.
 * @property {string} role - The agent's role.
 * @property {string} goal - The agent's goal.
 * @property {string} background - The agent's background.
 * @property {Tool[]} tools - The tools available to the agent.
 * @property {ILLMConfig} llmConfig - The language model configuration.
 * @property {number} maxIterations - The maximum number of iterations.
 * @property {boolean} forceFinalAnswer - Whether to force the final answer.
 */
class BaseAgent {
  id: string;
  store: TStore;
  status: AGENT_STATUS_enum;
  env: Record<string, any> | null;
  llmSystemMessage: string | null;

  name: string;
  role: string;
  goal: string;
  background: string;
  tools: Tool[];
  llmConfig: ILLMConfig;
  maxIterations: number;
  forceFinalAnswer: boolean;
  promptTemplates: TPromptTemplates;
  llmInstance: any;

  /**
   * Creates an instance of BaseAgent.
   * @param {IBaseAgentParams} params - The agent's parameters.
   */
  constructor({
    name,
    role,
    goal,
    background,
    tools = [],
    llmConfig,
    maxIterations = 10,
    forceFinalAnswer = true,
    promptTemplates,
    llmInstance = null,
  }: IBaseAgentParams) {
    this.id = uuidv4();
    this.name = name;
    this.role = role;
    this.goal = goal;
    this.background = background;
    this.tools = tools;
    this.maxIterations = maxIterations;
    this.store = null;
    this.status = AGENT_STATUS_enum.INITIAL;
    this.env = null;

    this.llmInstance = llmInstance;

    // Create a combined config with defaults and user-provided values
    const combinedLlmConfig: ILLMConfig = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxRetries: 1,
    };

    Object.assign(combinedLlmConfig, llmConfig);

    // Normalizes the llmConfig to match specific llmProviders schemas
    this.llmConfig = this.normalizeLlmConfig(combinedLlmConfig);

    this.llmSystemMessage = null;
    this.forceFinalAnswer = forceFinalAnswer;

    // Initialize promptTemplates
    this.promptTemplates = { ...REACT_CHAMPION_AGENT_DEFAULT_PROMPTS };
    // Allow custom prompts to override defaults
    Object.assign(this.promptTemplates, promptTemplates);
  }

  /**
   * Normalizes the LLM Config for different providers.
   * @param {ILLMConfig} llmConfig - The store to be set.
   */
  normalizeLlmConfig(llmConfig: ILLMConfig) {
    const { provider, apiBaseUrl } = llmConfig;
    let normalizedConfig: INLLMConfig = { ...llmConfig };

    if (apiBaseUrl) {
      switch (provider) {
        case 'openai':
          normalizedConfig.configuration = {
            basePath: apiBaseUrl,
          };
          break;

        case 'anthropic':
          normalizedConfig.anthropicApiUrl = apiBaseUrl;
          break;

        case 'google':
          normalizedConfig.baseUrl = apiBaseUrl;
          break;

        case 'mistral':
          normalizedConfig.endpoint = apiBaseUrl;
          break;

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    }

    return normalizedConfig;
  }

  /**
   * Sets the store.
   * @param {TStore} store - The store to be set.
   */
  setStore(store: TStore) {
    this.store = store;
  }

  /**
   * Sets the status of the agent.
   * @param {AGENT_STATUS_enum} status - The status to be set.
   */
  setStatus(status: AGENT_STATUS_enum) {
    this.status = status;
  }

  /**
   * Sets the environment variables.
   * @param {Record<string, any>} env - The environment variables to be set.
   */
  setEnv(env: Record<string, any>) {
    this.env = env;
  }

  workOnTask(_task: any) {
    throw new Error('workOnTask must be implemented by subclasses.');
  }
}

export { BaseAgent };
