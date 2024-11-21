/**
 * @file index.ts
 * @path KaibanJS/src/utils/helpers/prompts/index.ts
 * @description Central export file for prompt-related functionality
 * 
 * @module @helpers/prompts
 */

import REACT_CHAMPION_AGENT_DEFAULT_PROMPTS from './prompts';
import { IPromptTypeGuards } from '../../../types/agent';
import promptUtils from './utils';

/**
 * Validates that a prompts object implements all required templates
 * @throws Error if validation fails
 */
export function validatePrompts(prompts: unknown): asserts prompts is typeof REACT_CHAMPION_AGENT_DEFAULT_PROMPTS {
    if (!IPromptTypeGuards.isREACTChampionAgentPrompts(prompts)) {
        throw new Error('Invalid prompts object: missing required template functions');
    }
}

/**
 * Creates a new prompts object by extending the default prompts
 * @param overrides Partial prompts object to override default templates
 * @returns New prompts object with overrides applied
 * @throws Error if resulting prompts object is invalid
 */
export function createPrompts(overrides: Partial<typeof REACT_CHAMPION_AGENT_DEFAULT_PROMPTS>) {
    const prompts = {
        ...REACT_CHAMPION_AGENT_DEFAULT_PROMPTS,
        ...overrides
    };
    validatePrompts(prompts);
    return prompts;
}

// Named exports
export {
    REACT_CHAMPION_AGENT_DEFAULT_PROMPTS as defaultPrompts,
    promptUtils
};

// Export utility functions
export const {
    combineTemplates,
    withDefaults,
    wrapTemplate,
    selectPrompts,
    formatTemplate
} = promptUtils;

// Default export with all functionality
export default {
    defaultPrompts: REACT_CHAMPION_AGENT_DEFAULT_PROMPTS,
    validatePrompts,
    createPrompts,
    utils: promptUtils
};
