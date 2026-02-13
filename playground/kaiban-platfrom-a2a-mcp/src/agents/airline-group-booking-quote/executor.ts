/**
 * @fileoverview A2A Executor for Airline Group Booking Quote Agent
 *
 * Processes incoming A2A requests, extracts Kaiban activities, and runs the Group Booking Quote Team.
 * Card lifecycle (get card, move to doing/done, update result, activities) is handled by KaibanJS agents via Kaiban MCP.
 * On team error (variant 1), the executor calls Kaiban MCP to move the card to blocked.
 *
 * @module agents/airline-group-booking-quote/executor
 */

import {
  AgentExecutor,
  ExecutionEventBus,
  InMemoryTaskStore,
  RequestContext,
} from '@a2a-js/sdk/server';
import { A2ADataPartType, KaibanActivityPart } from '@kaiban/sdk';

import { createLogger } from '../../shared/logger';

import { processGroupBookingQuoteRequest } from './controller/agent';
import { getCard, moveCardToBlocked } from './controller/kaiban-mcp-client';

export const tasksStore = new InMemoryTaskStore();

const logger = createLogger('GroupBookingQuoteAgentExecutor');

const OUR_AGENT_NAME = 'Airline Group Booking Quote Agent';

function getOurAgentId(): string | null {
  return (
    process.env.KAIBAN_GROUP_BOOKING_QUOTE_AGENT_ID ||
    process.env.KAIBAN_AGENT_ID ||
    null
  );
}

class GroupBookingQuoteAgentExecutor implements AgentExecutor {
  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const { taskId, contextId, userMessage } = requestContext;

    eventBus.publish({
      kind: 'task',
      id: taskId,
      contextId: contextId,
      status: {
        state: 'submitted',
        timestamp: new Date().toISOString(),
      },
    });

    const userMessageData = userMessage.parts.filter(
      (part) => part.kind === 'data'
    );
    const ourAgentId = getOurAgentId();

    if (userMessageData && ourAgentId) {
      eventBus.publish({
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'working',
          timestamp: new Date().toISOString(),
        },
        final: false,
      });

      for (const messageData of userMessageData) {
        if (messageData.data.type !== A2ADataPartType.KAIBAN_ACTIVITY) continue;

        const part = messageData as KaibanActivityPart;
        const activity = part.data.activity;
        logger.info(
          { activityType: activity.type, cardId: activity.card_id },
          'Processing Kaiban activity from user message'
        );

        if (activity.actor?.id === ourAgentId) {
          logger.debug(
            { cardId: activity.card_id },
            'Skipping activity triggered by this agent'
          );
          continue;
        }

        const cardId = activity.card_id;
        const boardId = activity.board_id;
        const teamId = activity.team_id;
        if (!cardId || !boardId || !teamId) {
          logger.warn(
            { cardId, boardId, teamId },
            'Activity missing card_id, board_id, or team_id'
          );
          continue;
        }

        const card = await getCard(cardId);
        if (!card?.description || card.column_key !== 'todo') {
          logger.debug(
            {
              cardId,
              hasDescription: !!card?.description,
              column_key: card?.column_key,
            },
            'Skipping card: no description or not in todo'
          );
          continue;
        }

        const context = {
          card_id: cardId,
          board_id: boardId,
          team_id: teamId,
          agent_id: ourAgentId,
          agent_name: OUR_AGENT_NAME,
        };

        try {
          await processGroupBookingQuoteRequest(context);
        } catch (error) {
          logger.error(
            { error, cardId, boardId, teamId },
            'Failed to process card with group booking quote team'
          );
          try {
            await moveCardToBlocked(cardId, boardId, teamId, {
              id: ourAgentId,
              type: 'agent',
              name: OUR_AGENT_NAME,
            });
          } catch (blockedErr) {
            logger.error(
              { blockedErr, cardId },
              'Failed to move card to blocked via MCP'
            );
          }
        }
      }
    }

    eventBus.publish({
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: 'completed',
        timestamp: new Date().toISOString(),
      },
      final: true,
    });

    eventBus.finished();
  }

  async cancelTask(
    taskId: string,
    _eventBus: ExecutionEventBus
  ): Promise<void> {
    logger.info({ taskId }, 'Task cancellation requested (not implemented)');
    throw new Error(
      'Task cancellation is not yet implemented for Airline Group Booking Quote Agent'
    );
  }
}

export const groupBookingQuoteAgentExecutor =
  new GroupBookingQuoteAgentExecutor();
