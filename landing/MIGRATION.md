# JavaScript/JSX migration

The landing app has been migrated to JavaScript and JSX. No TypeScript source or TypeScript configuration files should remain under `landing/`.

## Run locally

```bash
npm install
npm run build
npm run dev
```

The dashboard routes currently provide UI scaffolding. Connect them to the existing Convex data queries and n8n workflow endpoints before treating dashboard metrics or campaign status as live.
