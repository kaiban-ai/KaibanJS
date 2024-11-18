/**
 * @file index.ts
 * @path src/stores/teamStore/index.ts
 * @description Central exports for team store
 */

export { default as createTeamStore } from './store';
export * from './actions';
export * from './selectors';

export { TeamStoreTypeGuards } from '@/utils/types/team/store';
export type {
    ITeamState,
    ITeamMember,
    ITeamStoreConfig,
    ITeamStoreMethods,
    ITeamStoreActions
} from '@/utils/types/team/store';