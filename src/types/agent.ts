import { IBaseAgentParams } from '../agents';

/**
 * ### Agent types
 */
export type TAgentTypes = 'ReactChampionAgent';

/**
 * ### Agent parameters
 * @interface IAgentParams
 * @extends IBaseAgentParams
 * @property {TAgentTypes} type - The type of agent.
 */
export interface IAgentParams extends IBaseAgentParams {
  type?: TAgentTypes;
}
