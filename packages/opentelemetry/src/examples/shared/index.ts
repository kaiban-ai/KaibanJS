/**
 * Shared resources for KaibanJS OpenTelemetry examples
 *
 * This module provides reusable teams, configurations, and utilities
 * for all OpenTelemetry examples.
 */

// Import functions from teams module
import {
  getTeamByName,
  getAvailableTeams,
  createSimpleDataTeam,
  createContentCreationTeam,
  createResumeCreationTeam,
  createSportsNewsTeam,
  createTripPlanningTeam,
  createProductSpecTeam,
} from './teams';

// Export all team factories
export {
  getTeamByName,
  getAvailableTeams,
  createSimpleDataTeam,
  createContentCreationTeam,
  createResumeCreationTeam,
  createSportsNewsTeam,
  createTripPlanningTeam,
  createProductSpecTeam,
};

// Export team types and interfaces
export type { Team, Agent, Task } from 'kaibanjs';

// Export configuration types
export type { OpenTelemetryConfig } from '../../types';

// Export utility functions
export const getTeamInfo = (teamName: string) => {
  const teams = getAvailableTeams();
  return teams.find((team) => team.name === teamName);
};

export const getAllTeamNames = () => {
  return getAvailableTeams().map((team) => team.name);
};

export const getTeamComplexity = (teamName: string) => {
  const simpleTeams = ['simple-data', 'content-creation'];
  const intermediateTeams = ['resume-creation', 'sports-news'];
  const complexTeams = ['trip-planning', 'product-spec'];

  if (simpleTeams.includes(teamName)) return 'simple';
  if (intermediateTeams.includes(teamName)) return 'intermediate';
  if (complexTeams.includes(teamName)) return 'complex';

  return 'unknown';
};

export const getTeamStats = (teamName: string) => {
  const team = getTeamByName(teamName);
  const store = team.getStore();
  const state = store.getState();

  return {
    name: state.name,
    agentCount: state.agents.length,
    taskCount: state.tasks.length,
    complexity: getTeamComplexity(teamName),
    estimatedDuration: getEstimatedDuration(teamName),
  };
};

const getEstimatedDuration = (teamName: string) => {
  const durations = {
    'simple-data': '30-60 seconds',
    'content-creation': '1-2 minutes',
    'resume-creation': '2-3 minutes',
    'sports-news': '2-3 minutes',
    'trip-planning': '3-5 minutes',
    'product-spec': '3-5 minutes',
  };

  return durations[teamName as keyof typeof durations] || 'Unknown';
};
