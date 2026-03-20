# @kaibanjs/openclaw-plugin

Plugin nativo OpenClaw (genérico) que expone un `Team KaibanJS` definido por el usuario como una tool para el agente principal de OpenClaw.

## Instalación en la máquina del Gateway

En la máquina donde corre el Gateway de OpenClaw:

```bash
openclaw plugins install ./packages/openclaw-plugin
openclaw stop
openclaw start
```

## Configuración en `openclaw.json`

1. Habilitar la entrada del plugin:

```json5
{
  plugins: {
    enabled: true,
    entries: {
      "kaibanjs-plugin": {
        enabled: true,
        config: {
          team: {
            // Debe existir en la máquina del Gateway (misma ruta).
            modulePath:
              "./packages/openclaw-plugin/examples/example.ts",
            exportName: "createTeam",
            metadataExportName: "teamMetadata",
            defaults: {}
          }
        }
      }
    }
  }
}
```

2. Permitir la tool al agente OpenClaw:

```json5
{
  agents: {
    list: [
      {
        id: "default",
        tools: {
          allow: ["kaiban_run_team"]
        }
      }
    ]
  }
}
```

## Cómo “sabe” OpenClaw cuándo llamar el Team (preferencia B)

El plugin registra una tool:

- `name`: `kaiban_run_team`
- `description`: `teamMetadata.description` exportado por el módulo del usuario

Esa `description` es la señal principal que el LLM usa para decidir si invoca la tool.

## Reemplazar el ejemplo

Edita `team.modulePath` en `openclaw.json` para apuntar a tu módulo con:

- `export const teamMetadata = { description: string }`
- `export function createTeam({ inputs, ctx? }): Team`

