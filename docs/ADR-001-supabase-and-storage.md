# ADR-001 — Supabase (managed Postgres) + provider-swappable Storage

Status: **Accepted** · Date: 2026-06-30 · Supersedes: nothing (refines Phase 2/3 infra)

## Context

The MVP needs a managed PostgreSQL with low ops overhead and a place to store
files (avatars, scrum attachments, payroll reports/exports, documents) within a
short internship timeline.

## Decision

1. **Use Supabase as the managed PostgreSQL provider.** Supabase is standard
   Postgres, so the Phase 3 schema, Prisma configuration, and Row-Level Security
   are unchanged. Prisma connects via `DATABASE_URL` (pooled/PgBouncer) and
   `DIRECT_URL` (direct, for migrations).
2. **Use Supabase Storage** for files, behind a `StorageProvider` port
   (`StorageModule`: `StorageService`, `UploadService`, `FileValidator`,
   `LocalStorageProvider`, `SupabaseStorageProvider`). Driver chosen by
   `STORAGE_DRIVER`.
3. **Do NOT use Supabase Auth, Realtime, Edge Functions, or Vector DB.** Auth
   remains the custom NestJS JWT + rotating refresh + RBAC design; mixing auth
   systems would add complexity for no MVP benefit.

## Consequences

- Managed backups, dashboard, SQL editor, monitoring, connection pooling — no
  local Postgres install required (local Docker Postgres remains an offline
  fallback).
- The service-role key is server-side only and never exposed to the client.
- Storage stays vendor-neutral: swapping to S3 later is one new provider class.
- `@supabase/supabase-js` is added as a dependency — run `npm install` after pulling.

## Alternatives considered

- **Self-hosted Postgres + local disk / S3 directly:** more ops + infra setup.
- **Supabase Auth + RLS-as-authorization:** would replace the already-designed
  JWT/RBAC layer and couple authorization to the DB; rejected for the MVP.
