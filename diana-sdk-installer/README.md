# ai-dr.fic

Diana SDK Installer: CLI instalable por `uvx` para inicializar Diana SDK en cualquier proyecto desde cero.

## Uso

```bash
uvx --from git+https://github.com/UltraFIC/ai-dr.fic.git diana init
```

## Comandos

- `diana init` - instala assets base de Diana en el proyecto destino.

## Opciones de `diana init`

- `--target <path>`: ruta destino (default: directorio actual)
- `--force`: sobrescribe archivos instalados por Diana
- `--skip-actions`: omite copia de `.github/prompts` y `.github/agents`

## Estructura instalada

- `.drfic/readme.md`
- `.drfic/diana-sdk/sdk/diana/**`
- `.drfic/diana-sdk/projects/knowledge/indexes/projects-knowledge-radar.yaml`
- `.github/prompts/diana.*.prompt.md` (si no se usa `--skip-actions`)
- `.github/agents/diana.*.agent.md` (si no se usa `--skip-actions`)

Incluye soporte de sincronizacion de tareas Speckit -> Diana TEAM:
- Prompt/agent: `diana.sync`
- Script local: `.drfic/diana-sdk/sdk/diana/scripts/powershell/diana-sync-team.ps1`
