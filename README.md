# ToolChain

**Every Tool. One Workflow.**

ToolChain is a free browser workspace for converting files and structured data. Use a tool on its own, or connect steps in a workflow and save the definition on your device.

## Run locally

Use Node.js 24.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. To run the release checks:

```sh
npx playwright install
npm run qa
```

See the [test plan](docs/TEST_PLAN.md) for the Firefox workaround on macOS and for running Playwright against the local Cloudflare runtime.

## What you can do

- Run 14 text, JSON, CSV, image, input and output tools. Copy text or download a result.
- Connect typed ports in the canvas or use the sequential list and connection controls on smaller screens.
- Run six editable templates or generate a draft from supported English and Korean commands.
- Inspect node status, elapsed time, port types, byte counts and intermediate results. Cancel a running workflow when needed.
- Save, duplicate, rename, delete, import or export workflow definitions. Browser files and execution results are held in memory. Supply runtime input again after reopening a workflow.
- Switch between English and Korean and select a light, dark or system theme.

Processing limits are 40 MiB per file, 5 million characters per text value, 24 megapixels per transformed image and 128 MiB of workflow results retained for preview. Animation is not preserved during image transformations.

## Project layout

- `src/core/` defines the plugin contract, port validation, workflow schema, and DAG execution.
- `src/tools/` implements the registry and transformations. CPU-intensive work runs in `src/workers/`.
- `src/features/` and `src/components/` provide the editor, tool catalog, templates and settings.
- `src/storage/` stores preferences and workflow definitions in IndexedDB via Dexie.
- `tests/` covers tools, execution, local storage and real-browser flows.

See the [architecture](docs/ARCHITECTURE.md), [progress](docs/PROGRESS.md) and [deployment guide](docs/DEPLOYMENT.md).
