# Decisions (ADR)

## ADR-001: Separate PMS app and Neon database

PMS is a sibling app (`Vecktrix-PMS`) with its own Neon Postgres. Never share CMS Prisma schema or connection string.

## ADR-002: Auth.js v5 + Prisma adapter

Reuse Auth.js patterns from Vecktrix CMS; JWT strategy; credentials + Google.

## ADR-003: Visual inheritance from marketing site

Port tokens/fonts/`bg.avif` from Vecktrix website; no separate product theme.

## ADR-004: Convert Lead creates Client only

No auto Project on conversion.

## ADR-005: Fixed five milestones + dynamic tasks

Milestones are templated; tasks are created during delivery with PM approval and sequential unlock.

## ADR-006: Client reviews milestones only

No task-level client review or comments.
