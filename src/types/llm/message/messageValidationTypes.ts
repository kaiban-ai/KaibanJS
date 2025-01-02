/**
 * @file messageValidationTypes.ts
 * @path KaibanJS/src/types/llm/message/messageValidationTypes.ts
 * @description Message validation type definitions for LLM domain
 * 
 * @module @types/llm/message
 */

import { BaseMessage } from '@langchain/core/messages';
import { MESSAGE_STATUS_enum } from '../../common/enumTypes';
import type { IValidationResult } from '../../common/validationTypes';
import type { IBaseMessageMetadata } from './messagingBaseTypes';

// ─── Content Validation Types ────────────────────────────────────────────────────

export interface IMessageContentValidator {
  validateMessageSize(message: BaseMessage): IValidationResult;
  validateMessageFormat(message: BaseMessage): IValidationResult;
  validateMessageContent(message: BaseMessage): IValidationResult;
}

// ─── Metadata Validation Types ────────────────────────────────────────────────────

export interface IMessageMetadataValidator {
  validateMetadata(metadata: unknown): IValidationResult;
}

// ─── State Validation Types ──────────────────────────────────────────────────────

export interface IMessageStateValidator {
  validateStatusTransition(
    currentStatus: MESSAGE_STATUS_enum,
    newStatus: MESSAGE_STATUS_enum
  ): IValidationResult;
  validateQueueState(queueSize: number): IValidationResult;
}

// ─── Combined Validation Types ────────────────────────────────────────────────────

export interface IMessageValidator {
  validateMessage(
    message: BaseMessage,
    metadata: IBaseMessageMetadata,
    queueSize?: number
  ): IValidationResult;
}

// ─── Validation Rule Types ──────────────────────────────────────────────────────

export interface IMessageValidationRules {
  contentValidation: {
    maxSize: number;
    minSize: number;
    allowedFormats: string[];
    requiredFields: string[];
  };
  metadataValidation: {
    requiredFields: (keyof IBaseMessageMetadata)[];
    maxRetryAttempts: number;
  };
  queueValidation: {
    maxSize: number;
    warningThreshold: number;
  };
}

// ─── Validation Context Types ────────────────────────────────────────────────────

export interface IMessageValidationContext {
  rules: IMessageValidationRules;
  queueSize?: number;
  currentStatus?: MESSAGE_STATUS_enum;
}

// ─── Validation Result Types ─────────────────────────────────────────────────────

export interface IMessageValidationResult extends IValidationResult {
  context?: {
    messageId?: string;
    validationType: 'content' | 'metadata' | 'state' | 'combined';
    validationTime: number;
    validationRules: Partial<IMessageValidationRules>;
  };
}
