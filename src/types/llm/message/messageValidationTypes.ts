/**
 * @file messageValidationTypes.ts
 * @path KaibanJS/src/types/llm/message/messageValidationTypes.ts
 * @description Message validation type definitions for LLM domain
 * 
 * @module @types/llm/message
 */

import { MESSAGE_STATUS_enum } from '../../common/commonEnums';
import type { IValidationResult } from '../../common/commonValidationTypes';
import type { 
  IMessageMetadata, 
  IMessageContent, 
  IMessageConfig,
  IMessageRules 
} from './messageTypes';

// ─── Content Validation Types ────────────────────────────────────────────────────

export interface IMessageContentValidator {
  validateMessageSize(size: number): IValidationResult;
  validateMessageFormat(content: unknown): IValidationResult;
  validateMessageContent(content: IMessageContent, config?: IMessageConfig): IValidationResult;
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
    content: IMessageContent,
    metadata: IMessageMetadata,
    config?: IMessageConfig,
    queueSize?: number
  ): IValidationResult;
}

// ─── Validation Rule Types ──────────────────────────────────────────────────────

export interface IMessageValidationRules extends IMessageRules {
  contentValidation: {
    maxSize: number;
    minSize: number;
    allowedFormats: string[];
    requiredFields: string[];
  };
  metadataValidation: {
    requiredFields: (keyof IMessageMetadata)[];
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
  config?: IMessageConfig;
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
