/**
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\agents.ts
 * Agent Utility Functions.
 *
 * This file provides utility functions specifically designed to support agent operations within the KaibanJS library. 
 * Functions include retrieving API keys based on agent configurations and cleaning JSON strings for parsing. These utilities 
 * aid in configuring agents accurately and handling their data interactions.
 *
 * Usage:
 * Use these utilities to manage agent configurations and preprocess data formats essential for the smooth operation of agents.
 */

/**
 * Retrieves the API key for a given LLM configuration and environment.
 * @param {Object} llmConfig - The LLM configuration object.
 * @param {Object} env - The environment object containing API keys.
 * @returns {string | undefined} The API key if found, undefined otherwise.
 */
export function getApiKey(llmConfig: { apiKey?: string; provider?: string }, env: Record<string, string>): string | undefined {
    if (llmConfig?.apiKey) return llmConfig.apiKey;

    const apiKeys: Record<string, string | undefined> = {
        anthropic: env.ANTHROPIC_API_KEY,
        google: env.GOOGLE_API_KEY,
        mistral: env.MISTRAL_API_KEY,
        openai: env.OPENAI_API_KEY,
        groq: env.GROQ_API_KEY
    };
    return apiKeys[llmConfig?.provider || ''];    
}

/**
 * Replaces placeholders in the agent prompt with actual attributes.
 * @param {string} template - The template string with placeholders.
 * @param {Object} attributes - The object containing attribute values.
 * @returns {string} The template with placeholders replaced by actual values.
 */
export function replaceAgentAttributes(template: string, attributes: Record<string, string>): string {
    return template
        .replace('{name}', attributes.name)
        .replace('{role}', attributes.role)
        .replace('{background}', attributes.background)
        .replace('{goal}', attributes.goal)
        .replace('{context}', attributes.context)
        .replace('{expectedOutput}', attributes.expectedOutput);
}

/**
 * Attempts to parse a JSON string, cleaning it up if necessary.
 * @param {string} str - The JSON string to parse.
 * @returns {Object | null} The parsed JSON object or null if parsing fails.
 */
export const getParsedJSON = (str: string): Record<string, any> | null => {
    try {
        // Directly attempt to parse the JSON first
        return JSON.parse(str);
    } catch (error) {
        // Attempt to fix common JSON issues
        let sanitizedStr = str
            .trim()
            // Normalize line breaks and spaces
            .replace(/\s*\n\s*/g, "")
            // Replace single quotes with double quotes
            .replace(/'/g, '"')
            // Ensure proper quoting around keys
            .replace(/([{,]\s*)([^"\s][a-zA-Z0-9_]+\s*):/g, '$1"$2":')
            // Ensure proper quoting around string values that are unquoted
            .replace(/:\s*([^"\s][^,}\s]*)(\s*[},])/g, ': "$1"$2')
            // Add missing commas between key-value pairs, accommodating various edge cases
            .replace(/(?<=}|\])(\s*{)/g, ',$1')
            .replace(/(["}\]])(\s*["{])/g, '$1,$2')
            // Remove trailing commas within objects or arrays
            .replace(/,\s*([}\]])/g, '$1');

        try {
            // Attempt to parse the sanitized string
            return JSON.parse(sanitizedStr);
        } catch (error) {
            console.error("Error parsing sanitized JSON:", error);
            return null;
        }
    }
};