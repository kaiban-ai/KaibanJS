/**
 * Base Agent Definition.
 *
 * This module defines the BaseAgent class, which serves as the foundational component for all agents
 * within the library. It includes fundamental methods for setting environment variables, managing agent
 * status, and abstract methods for task execution which must be implemented by subclasses to handle
 * specific tasks.
 *
 * @module baseAgent
 */

import { v4 as uuidv4 } from 'uuid';
import { AGENT_STATUS_enum } from '../utils/enums';
import { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from '../utils/prompts';
import { Task } from '../index';
import { BaseTool } from '../tools/baseTool';
import { TeamStore } from '../stores';
/** LLM configuration options */
export interface LLMConfig {
  /** LLM service provider */
  provider: string;
  /** Model name/version */
  model: string;
  /** Maximum number of retries for failed requests */
  maxRetries: number;
  /** Base URL for API requests */
  apiBaseUrl?: string;
  /** API configuration object */
  configuration?: {
    /** Base path for API requests */
    basePath: string;
  };
  /** Anthropic API URL */
  anthropicApiUrl?: string;
  /** Google base URL */
  baseUrl?: string;
  /** Mistral endpoint */
  endpoint?: string;
  /** API key */
  apiKey?: string;
}

/** Store interface */
export interface Store {
  // Define store methods as needed
  [key: string]: unknown;
}

/** Environment variables */
export interface Env {
  // Define environment variables as needed
  [key: string]: string;
}

/** Base agent constructor parameters */
export interface BaseAgentParams {
  /** Agent's unique identifier */
  id?: string;
  /** Agent's name */
  name: string;
  /** Agent's role description */
  role: string;
  /** Agent's goal */
  goal: string;
  /** Agent's background information */
  background: string;
  /** Available tools for the agent */
  tools?: BaseTool[];
  /** LLM configuration */
  llmConfig?: Partial<LLMConfig>;
  /** Maximum number of iterations */
  maxIterations?: number;
  /** Whether to force a final answer */
  forceFinalAnswer?: boolean;
  /** Custom prompt templates */
  promptTemplates?: Record<string, unknown>;
  /** Environment variables */
  env?: Env;
  /** Kanban tools to enable */
  kanbanTools?: string[];
}

/** Base agent class */
export abstract class BaseAgent {
  /** Unique identifier */
  readonly id: string;
  /** Agent's name */
  readonly name: string;
  /** Agent's role description */
  readonly role: string;
  /** Agent's goal */
  readonly goal: string;
  /** Agent's background information */
  readonly background: string;

  /** Maximum number of iterations */
  readonly maxIterations: number;
  /** Store instance */
  protected store: TeamStore | null;
  /** Available tools */
  protected tools: BaseTool[];
  /** Environment variables */
  protected env: Env;
  /** LLM configuration */
  protected llmConfig: LLMConfig;
  /** System message for LLM */
  protected llmSystemMessage: string | null;
  /** Whether to force a final answer */
  protected forceFinalAnswer: boolean;
  /** Prompt templates */
  protected promptTemplates: Record<string, (params: any) => string>;

  /** Current agent status */
  status: AGENT_STATUS_enum;

  /**
   * Creates a new BaseAgent instance
   * @param params - Agent initialization parameters
   */
  constructor({
    id = uuidv4(),
    name,
    role,
    goal,
    background,
    tools = [],
    llmConfig = {},
    maxIterations = 10,
    forceFinalAnswer = true,
    promptTemplates = {},
    env = {},
  }: BaseAgentParams) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.goal = goal;
    this.background = background;
    this.tools = tools;
    this.maxIterations = maxIterations;
    this.store = null;
    this.status = AGENT_STATUS_enum.INITIAL;
    this.env = env;

    // Create a combined config with defaults and user-provided values
    const combinedLlmConfig = {
      provider: 'openai' as const,
      model: 'gpt-4o-mini',
      maxRetries: 1,
      ...llmConfig,
    };

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
   * Normalizes LLM configuration based on provider
   * @param llmConfig - Raw LLM configuration
   * @returns Normalized LLM configuration
   */
  protected normalizeLlmConfig(llmConfig: Partial<LLMConfig>): LLMConfig {
    const { provider = 'openai', apiBaseUrl } = llmConfig;
    const normalizedConfig: LLMConfig = {
      provider,
      model: llmConfig.model || 'gpt-4o-mini',
      maxRetries: llmConfig.maxRetries || 1,
    };

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
   * Sets the store instance
   * @param store - Store instance
   */
  setStore(store: TeamStore): void {
    this.store = store;
  }

  /**
   * Sets the agent's status
   * @param status - New status
   */
  setStatus(status: AGENT_STATUS_enum): void {
    this.status = status;
  }

  /**
   * Sets environment variables
   * @param env - Environment variables
   */
  setEnv(env: Env): void {
    this.env = env;
  }

  /**
   * Process a task
   * @param task - The task to process
   * @param inputs - Optional task inputs
   * @param context - Optional task context
   */
  abstract workOnTask(task: Task, inputs?: any, context?: any): Promise<any>;

  /**
   * Resume work on a task
   * @param task - Task to resume
   */
  abstract workOnTaskResume(task: Task): Promise<void>;

  /**
   * Reset the agent
   */
  reset(): void {
    this.setStatus(AGENT_STATUS_enum.INITIAL);
  }
}
