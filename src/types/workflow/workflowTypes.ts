/**
 * @file workflowTypes.ts
 * @description Extended workflow types with Langchain integration
 */

import type { BaseChain } from 'langchain/chains';
import type { IStepConfig } from './workflowStateTypes';

/**
 * Extended step configuration with Langchain chain support
 */
export interface IChainStepConfig extends IStepConfig {
    /** Optional Langchain chain for this step */
    chain?: BaseChain;
    /** Input variables for the chain */
    inputs: string[];
    /** Output variables from the chain */
    outputs: string[];
}

/**
 * Type guard for chain step config
 */
export const isChainStepConfig = (step: IStepConfig): step is IChainStepConfig => {
    return (
        'chain' in step &&
        'inputs' in step &&
        'outputs' in step
    );
};
