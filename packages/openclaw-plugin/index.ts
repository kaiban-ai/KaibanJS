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

/** JSON Schema fragment for the tool parameter `inputs` (what OpenClaw must send). */
type TeamMetadataInputsSchema = {
  type?: 'object';
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

type UserTeamModule = {
  teamMetadata?: {
    description?: string;
    /** JSON Schema for `inputs` so the main agent uses the same keys as createTeam. */
    inputs?: TeamMetadataInputsSchema;
  };
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

function buildToolInputsParameterSchema(
  teamMetadata: UserTeamModule['teamMetadata'] | undefined,
  metadataExportName: string,
  pluginId: string
): Record<string, unknown> {
  const meta = teamMetadata?.inputs;
  if (meta == null) {
    return {
      type: 'object',
      description:
        'Inputs for the Team. Prefer defining teamMetadata.inputs in your module so keys match createTeam.',
      additionalProperties: true,
    };
  }
  if (typeof meta !== 'object' || meta === null) {
    throw new Error(
      `OpenClaw plugin ${pluginId}: "${metadataExportName}.inputs" must be a JSON Schema object.`
    );
  }
  const props = meta.properties;
  if (
    !props ||
    typeof props !== 'object' ||
    Object.keys(props as object).length === 0
  ) {
    throw new Error(
      `OpenClaw plugin ${pluginId}: "${metadataExportName}.inputs.properties" must list at least one field so the OpenClaw agent knows which keys to send (same keys as createTeam expects).`
    );
  }
  if (meta.type !== undefined && meta.type !== 'object') {
    throw new Error(
      `OpenClaw plugin ${pluginId}: "${metadataExportName}.inputs.type" must be "object" if set.`
    );
  }
  return {
    type: 'object',
    description:
      typeof meta.description === 'string' && meta.description.trim()
        ? meta.description
        : 'Team inputs. Use the property names and types defined in teamMetadata.inputs (same as createTeam).',
    properties: meta.properties,
    ...(Array.isArray(meta.required) && meta.required.length > 0
      ? { required: meta.required }
      : {}),
    additionalProperties: meta.additionalProperties ?? false,
  };
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

  const inputsParameterSchema = buildToolInputsParameterSchema(
    teamMetadata,
    metadataExportName,
    api.id
  );

  api.registerTool({
    name: 'kaiban_run_team',
    description,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        inputs: inputsParameterSchema,
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
      const workflowResult = await (
        teamInstance as {
          start: (overrides?: Record<string, unknown>) => unknown;
        }
      ).start();

      const text = resultToText(
        (workflowResult as { result?: unknown })?.result ?? workflowResult
      );

      return {
        content: [{ type: 'text', text }],
        details: { workflowResult },
      };
    },
  });
}
