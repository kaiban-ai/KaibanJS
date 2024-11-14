/**
 * @file index.ts
 * @path KaibanJS/src/types/store/index.ts
 * @description Central export point for store-base-related types, interfaces, and utilities
 */

// Re-exporting all base store types and utilities from base.ts
export {
    BaseStoreState,
    BaseStoreMethods,
    StoreSubscribe,
    SetStoreState,
    GetStoreState,
    IStoreApi,
    BoundStore,
    StoreCreator,
    StoreConfig,
    StoreValidationResult,
    StoreMiddlewareConfig,
    StoreSelector,
    StoreEventType,
    StoreEvent,
    StoreTypeGuards
} from './base';

// Re-exporting status-related types and utilities from status.ts
export {
    StatusEntity,
    StatusType,
    StatusHistoryEntry,
    StatusChangeEvent,
    StatusTransitionContext,
    StatusTransitionRule,
    StatusChangeCallback,
    StatusManagerConfig,
    StatusValidationResult,
    StatusErrorType,
    StatusError
} from './status';

// Re-exporting status type guards from statusGuards.ts
export { StatusTypeGuards } from './statusGuards';
