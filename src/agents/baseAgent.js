import { getApiKey } from './utils';
import { v4 as uuidv4 } from 'uuid';

class BaseAgent {
    constructor({ name, role, goal, background, tools, llmConfig = {}, maxIterations = 5 }) {
        this.id = uuidv4();
        this.name = name;
        this.role = role;
        this.goal = goal;
        this.background = background;
        this.tools = tools;
        this.maxIterations = maxIterations;

        const defaultConfig = {
            model: "gpt-3.5-turbo-0125",
            apiKey: getApiKey(llmConfig, llmConfig.provider || 'openai'),
        };
        this.llmConfig = { ...defaultConfig, ...llmConfig };

        if (!this.llmConfig.apiKey) {
            throw new Error('API key is missing. Please provide it through llmConfig or set the appropriate environment variables.');
        }
    }

    async initAgent() {
        throw new Error("initAgent must be implemented by subclasses.");
    }

    executeTask(task) {
        throw new Error("executeTask must be implemented by subclasses.");
    }
}

export { BaseAgent };