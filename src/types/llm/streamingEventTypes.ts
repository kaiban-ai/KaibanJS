/**
 * @file streamingEventTypes.ts
 * @path src/types/llm/streamingEventTypes.ts
 * @description Streaming-specific event type definitions
 */

import { IBaseEvent, IBaseHandlerMetadata } from '../common/baseTypes';
import { LLMResult } from '@langchain/core/outputs';
import { NewTokenIndices, HandleLLMNewTokenCallbackFields } from '@langchain/core/callbacks/base';
import { ILLMMetrics } from './llmMetricTypes';
import { createBaseMetadata } from '../common/baseTypes';
import { v4 as uuidv4 } from 'uuid';

export interface IStreamingEventMetadata extends IBaseHandlerMetadata {
    streamId: string;
    provider: string;
    model: string;
    metrics: ILLMMetrics;
}

export interface IStreamStartEvent extends IBaseEvent {
    type: 'llm_stream_start';
    metadata: IStreamingEventMetadata;
    data: {
        prompts: string[];
        runId: string;
        parentRunId?: string;
        tags?: string[];
    };
}

export interface IStreamTokenEvent extends IBaseEvent {
    type: 'llm_stream_token';
    metadata: IStreamingEventMetadata;
    data: {
        token: string;
        idx: NewTokenIndices;
        runId: string;
        parentRunId?: string;
        tags?: string[];
        fields?: HandleLLMNewTokenCallbackFields;
    };
}

export interface IStreamEndEvent extends IBaseEvent {
    type: 'llm_stream_end';
    metadata: IStreamingEventMetadata;
    data: {
        result: LLMResult;
        runId: string;
        parentRunId?: string;
        tags?: string[];
    };
}

export interface IStreamErrorEvent extends IBaseEvent {
    type: 'llm_stream_error';
    metadata: IStreamingEventMetadata;
    data: {
        error: Error;
        runId: string;
        parentRunId?: string;
        tags?: string[];
    };
}

export type StreamingEvent = 
    | IStreamStartEvent 
    | IStreamTokenEvent 
    | IStreamEndEvent 
    | IStreamErrorEvent;

export const createStreamingEvent = <T extends StreamingEvent>(
    type: T['type'],
    metadata: Omit<IStreamingEventMetadata, keyof IBaseHandlerMetadata>,
    data: T['data']
): T => {
    const baseMetadata = createBaseMetadata('StreamingManager', type);
    return {
        id: uuidv4(),
        type,
        timestamp: Date.now(),
        metadata: {
            ...baseMetadata,
            ...metadata
        },
        data
    } as T;
};

export const isStreamingEvent = (event: unknown): event is StreamingEvent => {
    if (typeof event !== 'object' || event === null) return false;
    const evt = event as Partial<StreamingEvent>;
    return (
        typeof evt.id === 'string' &&
        typeof evt.type === 'string' &&
        typeof evt.timestamp === 'number' &&
        typeof evt.metadata === 'object' &&
        evt.metadata !== null &&
        typeof evt.data === 'object' &&
        evt.data !== null &&
        ['llm_stream_start', 'llm_stream_token', 'llm_stream_end', 'llm_stream_error'].includes(evt.type)
    );
};
