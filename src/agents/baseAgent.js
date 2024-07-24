import { getApiKey } from '../utils/agents';
import { v4 as uuidv4 } from 'uuid';
import { AGENT_STATUS_enum } from '../utils/enums';


class BaseAgent {
    constructor({ name, role, goal, background, tools, llmConfig = {}, maxIterations = 10 }) {
        this.id = uuidv4();
        this.name = name;
        this.role = role;
        this.goal = goal;
        this.background = background;
        this.tools = tools;
        this.maxIterations = maxIterations;
        this.store = null;
        this.status = AGENT_STATUS_enum.INITIAL;

        const defaultConfig = {
            model: "gpt-3.5-turbo-0125",
            apiKey: getApiKey(llmConfig, llmConfig.provider || 'openai'),
            provider: llmConfig.provider || 'openai',
        };
        this.llmConfig = { ...defaultConfig, ...llmConfig };

        if (!this.llmConfig.apiKey) {
            throw new Error('API key is missing. Please provide it through llmConfig or set the appropriate environment variables.');
        }
    }

    async initAgent() {
        throw new Error("initAgent must be implemented by subclasses.");
    }

    setStore(store) {
        this.store = store;
    }

    setStatus(status) {
        this.status = status;
    }

    executeTask(task) {
        throw new Error("executeTask must be implemented by subclasses.");
    }
}

export { BaseAgent };