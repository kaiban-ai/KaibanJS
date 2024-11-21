/**
 * @file utils.ts
 * @path KaibanJS/src/utils/helpers/prompts/utils.ts
 * @description Utility functions for working with prompts
 * 
 * @module @helpers/prompts
 */

import type { IREACTChampionAgentPrompts } from '../../../types/agent';

/**
 * Combines multiple prompt templates into a single template
 * @param templates Array of templates to combine
 * @param separator Optional separator between templates (default: newline)
 * @returns Combined template function
 */
export function combineTemplates<T>(
    templates: Array<(params: T) => string>,
    separator: string = '\n'
): (params: T) => string {
    return (params: T) => templates.map(template => template(params)).join(separator);
}

/**
 * Creates a template function with default parameters
 * @param template Original template function
 * @param defaultParams Default parameter values
 * @returns New template function with defaults
 */
export function withDefaults<T extends object>(
    template: (params: T) => string,
    defaultParams: Partial<T>
): (params: Partial<T>) => string {
    return (params: Partial<T>) => template({ ...defaultParams, ...params } as T);
}

/**
 * Wraps a template function with pre/post processing
 * @param template Original template function
 * @param preProcess Function to process parameters before template
 * @param postProcess Function to process output after template
 * @returns Wrapped template function
 */
export function wrapTemplate<T, U = T>(
    template: (params: T) => string,
    preProcess: (params: U) => T,
    postProcess: (output: string) => string = output => output
): (params: U) => string {
    return (params: U) => postProcess(template(preProcess(params)));
}

/**
 * Creates a partial prompts object by selecting specific templates
 * @param prompts Full prompts object
 * @param keys Template keys to include
 * @returns Partial prompts object
 */
export function selectPrompts<K extends keyof IREACTChampionAgentPrompts>(
    prompts: IREACTChampionAgentPrompts,
    keys: K[]
): Pick<IREACTChampionAgentPrompts, K> {
    return keys.reduce((acc, key) => {
        acc[key] = prompts[key];
        return acc;
    }, {} as Pick<IREACTChampionAgentPrompts, K>);
}

/**
 * Formats a template string with consistent indentation
 * @param template Template string
 * @param indentLevel Number of spaces for indentation (default: 2)
 * @returns Formatted template string
 */
export function formatTemplate(template: string, indentLevel: number = 2): string {
    const lines = template.split('\n');
    const baseIndent = lines[0].match(/^\s*/)?.[0].length ?? 0;
    
    return lines
        .map(line => {
            const currentIndent = line.match(/^\s*/)?.[0].length ?? 0;
            const relativeIndent = Math.max(0, currentIndent - baseIndent);
            return ' '.repeat(relativeIndent * indentLevel) + line.trim();
        })
        .join('\n');
}

export default {
    combineTemplates,
    withDefaults,
    wrapTemplate,
    selectPrompts,
    formatTemplate
};
