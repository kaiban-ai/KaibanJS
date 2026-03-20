import path from 'node:path';
import { pathToFileURL } from 'node:url';

type PluginRegisterApi = {
  id: string;
  pluginConfig?: Record<string, unknown>;
  config?: unknown;
  logger?: {
    info?: (message: string) => void;
    warn?: (message: string) => void;
    error?: (message: string) => void;
  };
  resolvePath?: (input: string) => string;
  registerTool: (tool: unknown) => void;
};

type UserTeamModule = {
  // Prefer metadata to feed tool.description (so OpenClaw's main agent can decide when to call it).
  teamMetadata?: { description?: string };
  createTeam?: (args: {
    inputs: Record<string, unknown>;
    ctx?: {
      sessionId?: string;
      agentId?: string;
      channelId?: string;
    };
  }) => unknown;
};

function resultToText(result: unknown): string {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  if (typeof result === 'object') {
    const maybeObj = result as Record<string, unknown>;
    if (typeof maybeObj.result === 'string') return maybeObj.result;
    if (maybeObj.result != null) return String(maybeObj.result);
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }
  return String(result);
}

function toImportUrl(resolvedPath: string): string {
  if (resolvedPath.startsWith('file:')) return resolvedPath;
  const abs = path.isAbsolute(resolvedPath)
    ? resolvedPath
    : path.resolve(process.cwd(), resolvedPath);
  return pathToFileURL(abs).href;
}

export default async function register(api: PluginRegisterApi) {
  const pluginConfig = api.pluginConfig ?? {};
  const teamCfg = (pluginConfig as { team?: unknown }).team;
  if (!teamCfg || typeof teamCfg !== 'object') {
    throw new Error(
      `OpenClaw plugin ${api.id}: missing "plugins.entries.${api.id}.config.team" object.`
    );
  }

  const team = teamCfg as {
    modulePath?: string;
    exportName?: string;
    metadataExportName?: string;
    defaults?: Record<string, unknown>;
  };

  const modulePath = team.modulePath;
  if (!modulePath) {
    throw new Error(
      `OpenClaw plugin ${api.id}: "config.team.modulePath" is required.`
    );
  }

  const exportName = team.exportName ?? 'createTeam';
  const metadataExportName = team.metadataExportName ?? 'teamMetadata';
  const defaults = team.defaults ?? {};

  const resolvedPath = api.resolvePath
    ? api.resolvePath(modulePath)
    : modulePath;
  const importUrl = toImportUrl(resolvedPath);

  const mod: UserTeamModule = (await import(importUrl)) as UserTeamModule;
  const createTeam = (mod as Record<string, unknown>)[exportName] as
    | UserTeamModule['createTeam']
    | undefined;

  const teamMetadata = (mod as Record<string, unknown>)[metadataExportName] as
    | UserTeamModule['teamMetadata']
    | undefined;

  const description = teamMetadata?.description;
  if (typeof description !== 'string' || !description.trim()) {
    throw new Error(
      `OpenClaw plugin ${api.id}: "${metadataExportName}.description" must be a non-empty string.`
    );
  }
  if (typeof createTeam !== 'function') {
    throw new Error(
      `OpenClaw plugin ${api.id}: "${exportName}" export must be a function.`
    );
  }

  // IMPORTANT:
  // - The tool description is the primary signal the OpenClaw LLM uses to decide tool invocation.
  // - With your preference (B), we set it from teamMetadata.description.
  api.registerTool({
    name: 'kaiban_run_team',
    description,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        inputs: {
          type: 'object',
          description:
            'Inputs for the Team. Usually includes topic/message/task fields.',
          additionalProperties: true,
        },
      },
      required: ['inputs'],
    },
    async execute(
      _toolId: string,
      params: { inputs: Record<string, unknown> }
    ) {
      const userInputs = params?.inputs ?? {};
      const inputs = { ...defaults, ...userInputs };

      const teamInstance = await createTeam({ inputs, ctx: undefined });
      const workflowResult = await (teamInstance as any).start({ inputs });

      const text = resultToText(
        (workflowResult as any)?.result ?? workflowResult
      );

      return {
        content: [{ type: 'text', text }],
        details: { workflowResult },
      };
    },
  });
}
