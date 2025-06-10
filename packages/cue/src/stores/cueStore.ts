import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { z } from 'zod';
import type {
  Block,
  BlockContext,
  BlockResult,
  CueResult,
  BlockStatus,
} from '../types';

export enum CUE_STATUS {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
}

export interface CueLog {
  timestamp: number;
  logType: 'CueStatusUpdate' | 'BlockStatusUpdate';
  logDescription: string;
  metadata?: Record<string, unknown>;
  cueStatus?: CUE_STATUS;
  blockStatus?: BlockStatus;
  blockId?: string;
  blockResult?: BlockResult;
}

export interface CueStoreState {
  status: CUE_STATUS;
  logs: CueLog[];
  blockResults: Map<string, BlockResult>;
  currentBlock?: Block<any, any>;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
}

export interface CueStoreActions {
  setStatus: (status: CUE_STATUS) => void;
  addLog: (log: CueLog) => void;
  updateBlockResult: (blockId: string, result: BlockResult) => void;
  setCurrentBlock: (block: Block<any, any>) => void;
  updateExecutionPath: (path: number[]) => void;
  updateSuspendedPaths: (paths: Record<string, number[]>) => void;
  reset: () => void;
}

export type CueStore = CueStoreState & CueStoreActions;

export const useCueStore = create<CueStore>()(
  devtools(
    (set, get) => ({
      status: CUE_STATUS.INITIAL,
      logs: [],
      blockResults: new Map(),
      currentBlock: undefined,
      executionPath: [],
      suspendedPaths: {},

      setStatus: (status: CUE_STATUS) => {
        const log: CueLog = {
          timestamp: Date.now(),
          logType: 'CueStatusUpdate',
          logDescription: `Cue status changed to ${status}`,
          cueStatus: status,
        };
        set((state) => ({
          status,
          logs: [...state.logs, log],
        }));
      },

      addLog: (log: CueLog) => {
        set((state) => ({
          logs: [...state.logs, log],
        }));
      },

      updateBlockResult: (blockId: string, result: BlockResult) => {
        const log: CueLog = {
          timestamp: Date.now(),
          logType: 'BlockStatusUpdate',
          logDescription: `Block ${blockId} ${result.status}`,
          blockStatus: result.status,
          blockId,
          blockResult: result,
        };

        set((state) => ({
          blockResults: new Map(state.blockResults).set(blockId, result),
          logs: [...state.logs, log],
        }));
      },

      setCurrentBlock: (block: Block<any, any>) => {
        set({ currentBlock: block });
      },

      updateExecutionPath: (path: number[]) => {
        set({ executionPath: path });
      },

      updateSuspendedPaths: (paths: Record<string, number[]>) => {
        set({ suspendedPaths: paths });
      },

      reset: () => {
        set({
          status: CUE_STATUS.INITIAL,
          logs: [],
          blockResults: new Map(),
          currentBlock: undefined,
          executionPath: [],
          suspendedPaths: {},
        });
      },
    }),
    {
      name: 'cueStore',
    }
  )
);
