/**
 * Example module for the generic OpenClaw plugin:
 * - exports `teamMetadata.description` (preference B) so OpenClaw can choose the tool
 * - exports `createTeam(...)` to build and run a KaibanJS Team
 *
 * Replace this module (or update `openclaw.json`) with your own Team implementation.
 */
import { Agent, Task, Team } from 'kaibanjs';

export const teamMetadata = {
  description:
    'Ejecuta un workflow KaibanJS multi-agente para: investigar un tema, redactar contenido y revisarlo. Úsalo cuando el usuario pida un análisis, investigación o generación de un borrador final con revisión de calidad.',
};

export function createTeam({
  inputs,
}: {
  inputs: Record<string, unknown>;
}): Team {
  const topic = String(inputs.topic ?? inputs.message ?? inputs.task ?? '');

  const researcher = new Agent({
    name: 'ResearchBot',
    role: 'Research Specialist',
    goal: 'Gather and analyze information',
    background: 'Expert in data collection and analysis',
  });

  const writer = new Agent({
    name: 'WriterBot',
    role: 'Content Writer',
    goal: 'Create engaging content from research',
    background: 'Professional content creator and editor',
  });

  const reviewer = new Agent({
    name: 'ReviewBot',
    role: 'Quality Reviewer',
    goal: 'Ensure content meets quality standards',
    background: 'Quality assurance specialist',
  });

  const researchTask = new Task({
    title: 'Research Topic',
    description: 'Research the given {topic} and extract key information',
    expectedOutput: 'Structured research data',
    agent: researcher,
  });

  const writingTask = new Task({
    title: 'Create Content',
    description: 'Transform research into engaging content',
    expectedOutput: 'Draft content',
    agent: writer,
  });

  const reviewTask = new Task({
    title: 'Review Content',
    description: 'Review and polish the content',
    expectedOutput: 'Final polished content',
    agent: reviewer,
  });

  return new Team({
    name: 'KaibanJS OpenClaw plugin example',
    agents: [researcher, writer, reviewer],
    tasks: [researchTask, writingTask, reviewTask],
    inputs: { topic },
    env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '' },
  });
}
