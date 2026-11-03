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

- Run 21 text, JSON, CSV, image, PDF, ZIP, control-flow, input and output tools. Copy text or download a result.
- Connect typed ports in the canvas or use the sequential list and connection controls on smaller screens.
- Run six editable templates or generate a draft from supported English and Korean commands.
- Run conditional text branches and up to four independent steps concurrently. Filter node logs, inspect the timeline and intermediate results, and export run diagnostics without file contents.
- Save, duplicate, rename, delete, import or export workflow definitions. Browser files and execution results are held in memory. Supply runtime input again after reopening a workflow.
- Share a saved workflow as a public link. The recipient can review it and make a separate local copy. The link includes the definition and settings. Runtime inputs stay on your device.
- Switch between English and Korean and select a light, dark or system theme.

Processing limits are 40 MiB per file, 5 million characters per text value, 24 megapixels per transformed image and 128 MiB of workflow results retained for preview. Animation is not preserved during image transformations. PDF output is limited to 500 pages, and ZIP operations accept up to 100 files with 40 MiB of total uncompressed content. ZIP extraction converts folder separators to double underscores in the downloaded filenames.

## Project layout

- `src/core/` defines the plugin contract, port validation, workflow schema, and DAG execution.
- `src/tools/` implements the registry and transformations. CPU-intensive work runs in `src/workers/`.
- `src/features/` and `src/components/` provide the editor, tool catalog, templates and settings.
- `src/storage/` stores preferences and workflow definitions in IndexedDB via Dexie.
- `tests/` covers tools, execution, local storage and real-browser flows.

See the [architecture](docs/ARCHITECTURE.md), [progress](docs/PROGRESS.md) and [deployment guide](docs/DEPLOYMENT.md).
