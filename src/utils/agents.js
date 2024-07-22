function getApiKey(llmConfig, provider) {
    if (llmConfig?.apiKey) return llmConfig.apiKey;

    let env = {};

    if (typeof process !== 'undefined' && process.env) {
        env = process.env;
    } else if (typeof window !== 'undefined') {
        env = window?.process?.env || import.meta.env || {};
    }

    const apiKeys = {
        anthropic: env.ANTHROPIC_API_KEY || env.NEXT_PUBLIC_ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY,
        google: env.GOOGLE_API_KEY || env.NEXT_PUBLIC_GOOGLE_API_KEY || env.VITE_GOOGLE_API_KEY,
        mistral: env.MISTRAL_API_KEY || env.NEXT_PUBLIC_MISTRAL_API_KEY || env.VITE_MISTRAL_API_KEY,
        openai: env.OPENAI_API_KEY || env.NEXT_PUBLIC_OPENAI_API_KEY || env.VITE_OPENAI_API_KEY,
    };

    return apiKeys[provider] || apiKeys.openai || (() => { throw new Error('API key is missing. Please provide it through llmConfig or set the appropriate environment variables.'); })();
}

// Utility function to replace placeholders in the agent prompt.
function replaceAgentAttributes(template, attributes) {
    return template
        .replace('{name}', attributes.name)
        .replace('{role}', attributes.role)
        .replace('{background}', attributes.background)
        .replace('{goal}', attributes.goal)
        .replace('{context}', attributes.context)
        .replace('{expectedOutput}', attributes.expectedOutput);
}

export { getApiKey, replaceAgentAttributes };