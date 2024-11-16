/**
 * @file validation.ts
 * @description Agent validation types and interfaces
 */

export interface AgentValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface AgentValidationSchema {
    name: {
        required: boolean;
        minLength?: number;
        maxLength?: number;
    };
    role: {
        required: boolean;
        allowedRoles?: string[];
    };
    goal: {
        required: boolean;
        maxLength?: number;
    };
    background: {
        required: boolean;
        maxLength?: number;
    };
    llmConfig: {
        provider: {
            required: boolean;
            allowedProviders?: string[];
        };
        model: {
            required: boolean;
            allowedModels?: string[];
        };
    };
}

export const defaultAgentValidationSchema: AgentValidationSchema = {
    name: {
        required: true,
        minLength: 2,
        maxLength: 50
    },
    role: {
        required: true
    },
    goal: {
        required: true,
        maxLength: 200
    },
    background: {
        required: true,
        maxLength: 500
    },
    llmConfig: {
        provider: {
            required: true
        },
        model: {
            required: true
        }
    }
};
