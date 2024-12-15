/**
 * @file errorPatternTypes.ts
 * @path src/types/metrics/base/errorPatternTypes.ts
 * @description Error pattern type definitions
 */

export interface IErrorPatternContext {
    readonly preconditions: readonly string[];
    readonly triggers: readonly string[];
    readonly symptoms: readonly string[];
}
