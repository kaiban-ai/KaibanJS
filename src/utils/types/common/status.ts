/**
 * @file status.ts
 * @path src/utils/types/common/status.ts
 * @description Status-related type definitions and interfaces
 */

import {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from './enums';

/**
 * Combined status types
 */
export type StatusType = 
    | keyof typeof AGENT_STATUS_enum 
    | keyof typeof MESSAGE_STATUS_enum
    | keyof typeof TASK_STATUS_enum 
    | keyof typeof WORKFLOW_STATUS_enum;

/**
 * Status entity types
 */
export type StatusEntity = 'agent' | 'message' | 'task' | 'workflow';

/**
 * Status transition validation context
 */
export interface StatusTransitionContext {
    /** Current status of the entity */
    currentStatus: StatusType;
    
    /** Target status for the transition */
    targetStatus: StatusType;
    
    /** Type of entity being transitioned */
    entity: StatusEntity;
    
    /** Unique identifier for the entity */
    entityId: string;
    
    /** Additional transition metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Status change event interface
 */
export interface StatusChangeEvent {
    /** Event timestamp */
    timestamp: number;
    
    /** Type of entity that changed */
    entity: StatusEntity;
    
    /** Unique identifier for the entity */
    entityId: string;
    
    /** Previous status */
    previousStatus: StatusType;
    
    /** New status */
    newStatus: StatusType;
    
    /** Additional event metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Status change callback type
 */
export type StatusChangeCallback = (event: StatusChangeEvent) => void | Promise<void>;

/**
 * Status history entry interface
 */
export interface StatusHistoryEntry {
    /** Entry timestamp */
    timestamp: number;
    
    /** Previous status */
    from: StatusType;
    
    /** New status */
    to: StatusType;
    
    /** Type of entity */
    entity: StatusEntity;
    
    /** Entity identifier */
    entityId: string;
    
    /** Entry metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Status transition rule interface
 */
export interface StatusTransitionRule {
    /** Valid starting status(es) */
    from: StatusType | StatusType[];
    
    /** Valid target status(es) */
    to: StatusType | StatusType[];
    
    /** Optional validation function */
    validation?: (context: StatusTransitionContext) => boolean | Promise<boolean>;
    
    /** Optional side effects to execute */
    sideEffects?: (context: StatusTransitionContext) => Promise<void>;
}

/**
 * Status manager configuration interface
 */
export interface StatusManagerConfig {
    /** Enable history tracking */
    enableHistory?: boolean;
    
    /** Maximum history entries to retain */
    maxHistoryLength?: number;
    
    /** Validation timeout in milliseconds */
    validationTimeout?: number;
    
    /** Allow concurrent transitions */
    allowConcurrentTransitions?: boolean;
}

/**
 * Status validation result interface
 */
export interface StatusValidationResult {
    /** Whether the status is valid */
    isValid: boolean;
    
    /** Validation errors if any */
    errors?: string[];
    
    /** Validation context */
    context?: Record<string, unknown>;
}

/**
 * Status error types
 */
export type StatusErrorType = 
    | 'INVALID_TRANSITION'
    | 'VALIDATION_FAILED'
    | 'TIMEOUT'
    | 'CONCURRENT_TRANSITION'
    | 'INVALID_STATE';

/**
 * Status error interface
 */
export interface StatusError {
    /** Error type */
    type: StatusErrorType;
    
    /** Error message */
    message: string;
    
    /** Error context */
    context?: StatusTransitionContext;
    
    /** Additional error metadata */
    metadata?: Record<string, unknown>;
}