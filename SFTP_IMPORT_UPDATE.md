# SFTP Import Update (Nov 2025)

This document summarizes the fixes applied to ensure the manual **Actualizar información** button (`/admin`) syncs real data from the SFTP server without deleting existing records.

## Changes Implemented

1. **Server-safe SFTP client**
   - `apps/web/src/lib/sftp-client.ts` now resolves an absolute `/api/sftp` URL in server contexts, includes helpers to set base URL and default headers, and no longer falls back to mock data.
   - Added `setDefaultFetchOptions` so API routes can forward auth headers/cookies when calling `/api/sftp`, keeping the call authenticated like the user or cron service.

2. **Manual import route**
   - `apps/web/src/app/api/import-sftp-real-data/route.ts` sets the SFTP client base URL per request, forwards either `x-cron-secret` (for scheduled runs) or the requester’s cookies, and logs which base URL is used.
   - Employee records are now written via batched `upsert` on `numero_empleado` (no deletions), and bajas only replace matching `numero_empleado|fecha_baja|motivo` rows before inserting new data.

3. **Verification**
- Manual run log shows real SFTP files (`Prenomina Horizontal.csv`, `Validacion Alta de empleados.xls`, `MotivosBaja.csv`, `Incidencias.csv`), processing 1,021 empleados and 211 bajas without touching attendance.
- Added a new ingestion step for `Incidencias.csv`. The file is parsed via Papaparse (to honor quoted commas) and rows are stored in `public.incidencias`. Because the CSV no longer includes números de empleado, each row gets a synthetic negative `emp` identifier; this keeps totals accurate while we wait for richer source data. Existing incidencias within the same date range are replaced so the dashboard reflects the latest SFTP export.
   - Supabase project `ufdlwhdrrvktthcxwpzt` now reports 1,021 employees (latest ingreso `2025‑11‑19`) and 834 motivos (`max fecha_baja 2025‑11‑16`), proving new data was added instead of mocked.

## Operational Notes

- If a cron secret (`CRON_SYNC_SECRET`) is configured, scheduled runs authenticate via `x-cron-secret`. Manual runs reuse the requester’s cookies so `/api/sftp` sees the same session.
- Future additions (e.g., asistencia ACT files) should follow the same pattern: download real SFTP data, transform, and `upsert`/selectively delete to avoid wiping historical records.

## Why It Previously Failed

- The manual import route tried to re-use the **client-side** `sftpClient`, which only knows `/api/sftp` as a relative path and sends no auth headers when executed on the server. From the backend that `fetch('/api/sftp?...')` resolved incorrectly and Next.js returned an HTML error page, so we parsed `"<!DOCTYPE..."` instead of JSON and fell back to mock data.
- Moreover, employee imports used `delete().in(numero_empleado, …)` before inserting, so even if data arrived it could wipe rows for employees missing in the latest file.

## How It Was Fixed

1. **Server Awareness** – `sftpClient` now builds an absolute URL (`http(s)://host/api/sftp`) when running on the server and accepts headers via `setDefaultFetchOptions`. The import route populates those headers with either `x-cron-secret` or the user’s cookies, so `/api/sftp` sees an authenticated request.
2. **No Mock Fallback** – All mock responses were removed; if `/api/sftp` fails we log/return the real error, making sync issues visible instead of silently returning fake CSVs.
3. **Upsert Strategy** – Employee batches call `upsert(..., onConflict: 'numero_empleado')`, eliminating the pre-delete step. Bajas only delete the precise IDs that match the incoming `(numero_empleado, fecha_baja, motivo)` combination before inserting, so historical rows remain untouched.


