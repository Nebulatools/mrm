# Repository Guidelines

## Project Structure & Module Organization
- Monorepo using npm workspaces.
- `apps/web/` — Next.js 14 app (App Router) with Tailwind and shadcn/ui. Source in `apps/web/src`.
- `apps/functions/` — Supabase Edge Functions (Deno). Example: `sftp-ingestion`.
- `packages/` — Shared utilities/types (if present).
- `docs/` — Architecture and KPI documentation.
- Utility scripts at repo root for SFTP and data import.

## Build, Test, and Development Commands
- `npm run dev` — Start Next.js dev server for `apps/web` at `http://localhost:3000`.
- `npm run build` — Production build for `apps/web`.
- `npm run start` — Start built app.
- `npm run lint` — ESLint (Next.js config) for `apps/web`.
- `npm run type-check` — TypeScript type checking (no emit).
- Data utilities: `node test-sftp.js`, `node analyze-sftp-data.js`, `node import-sftp-data.js` (loads env from `apps/web/.env.local`).

## Coding Style & Naming Conventions
- Language: TypeScript. Framework: Next.js 14 (App Router). Styling: Tailwind CSS.
- Linting: ESLint extends `next/core-web-vitals` and `next/typescript` (`apps/web/.eslintrc.json`).
- Indentation 2 spaces; prefer trailing commas; semicolons permitted (match surrounding file).
- File names: kebab-case (e.g., `kpi-card.tsx`, `ai-analyzer.ts`).
- React components: PascalCase exports; helpers/utilities: camelCase.
- Imports use `@/` alias for `apps/web/src` (e.g., `@/lib/kpi-calculator`).

## Testing Guidelines
- No test framework configured yet. When adding tests:
  - Unit tests: `apps/web/src/**/*.test.ts(x)` using Vitest or Jest.
  - E2E (optional): Playwright under `apps/web/e2e`.
  - Aim for ≥80% coverage on new/changed code.
  - Keep tests deterministic; mock network/Supabase where possible.

## Commit & Pull Request Guidelines
- Use Conventional Commits (seen in history): `feat: ...`, `fix: ...`, `chore: ...`.
- Branch naming: `feature/<short-name>` or `fix/<short-name>`.
- PRs must include:
  - Clear description, scope, and linked issues.
  - Screenshots/GIFs for UI changes.
  - Steps to verify locally (commands, env vars touched).
  - Checklist: `npm run lint` and `npm run type-check` pass.

## Security & Configuration Tips
- Never commit secrets. Use `apps/web/.env.local` (see `SECURITY.md`).
- Required vars: Supabase URL/keys, SFTP credentials; optional Gemini API key.
- For Edge Functions, use platform secrets; do not expose service role keys client-side.

