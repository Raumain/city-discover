# City Discover Production-Readiness Plan

## 1) Review of what is already implemented (from `executed-plan.md`)

### Overall assessment
The executed plan is **largely implemented at MVP/prototype level**. The app has the requested tab structure, core domain/feature logic modules, and unit tests for those pure modules. The biggest gap is that many capabilities are still **demo-wired** (mock data and UI-only toggles) rather than production integrations.

### Implemented vs plan items

| Executed plan item | Current state | Notes |
|---|---|---|
| Architecture/data model for boundary, graph segments, tracks, aggregates | **Implemented (basic)** | Types/functions exist in `src/domain` and `src/features`; no persistent storage model yet. |
| OSM ingestion/snapshot with walkable filtering + segment generation | **Implemented (basic)** | `src/features/osm/ingestion.ts` filters walkable roads and splits by node pairs. No real OSM fetch/cache pipeline. |
| Tracking session logic + quality filters | **Implemented (basic)** | `src/features/tracking/session.ts` handles accuracy, duplicates, jump rejection. No real device GPS/background service integration. |
| Discovery aggregation (length primary, segment secondary) | **Implemented** | `src/domain/discovery.ts` matches requested metric conventions. |
| Health Connect distance resolver + step fallback | **Implemented (logic only)** | `src/features/health/healthConnect.ts` has fallback logic but no native Health Connect integration layer. |
| Map tab with discovery metrics + visualization | **Implemented (demo)** | `app/(tabs)/index.tsx` + `components/map/CityStreetMap.tsx` render synthetic map lines, not a real geospatial map stack. |
| Stats tab (day/week steps, km, period %, cumulative %) | **Implemented (demo)** | `app/(tabs)/stats.tsx` computes expected metrics from mock data. |
| Settings tab (permissions/setup/behavior) | **Implemented (UI-only)** | `app/(tabs)/settings.tsx` toggles are local component state only. |
| Motivation logic (caps, suppression, behind-goal) | **Implemented** | `src/features/motivation/engine.ts` present with tests. |
| Tests + type safety checks | **Partially implemented** | 6 Jest suites pass; TypeScript check currently fails in `components/ExternalLink.tsx` (`href` typing). |

### Key production gaps identified
1. **No persistent data layer** (sessions, discovered segments, user settings, city snapshot are not durable).
2. **No real integrations** for OSM retrieval, Health Connect APIs, GPS/background tracking, notifications.
3. **UI is still mock-driven** through `src/features/discovery/mockData.ts`.
4. **Type-check is currently broken** (`components/ExternalLink.tsx`).
5. **No release pipeline** (CI/CD, build signing, crash monitoring, observability, rollout controls).

---

## 2) Step-by-step plan to make the app production ready

### Phase 1 — Stabilize foundation and quality gates
1. Fix TypeScript compile error in `components/ExternalLink.tsx` and make `npx tsc --noEmit` pass.
2. Add strict CI checks (type-check + tests) in GitHub Actions before merge.
3. Add repository scripts for standardized checks (`test`, `typecheck`, optional `test:watch`).
4. Define production env strategy (`app.json` + Expo config for dev/staging/prod values).

### Phase 2 — Replace mock composition with real app data flow
1. Introduce an app data layer (e.g., SQLite/MMKV + repository modules) for:
   - city snapshot + segments
   - discovered progress per segment
   - walk sessions and accepted points summary
   - user settings/preferences
2. Refactor `src/features/discovery/mockData.ts` into:
   - bootstrapping orchestrator/service
   - interfaces for real providers (OSM, tracking, health, motivation, storage)
3. Wire tabs (`Map`, `Stats`, `Settings`) to real selectors/hooks instead of hardcoded demo values.

### Phase 3 — Tracking and discovery pipeline (real device behavior)
1. Implement location permission flow and user prompts (foreground first, background later by need).
2. Build a real tracking session manager:
   - start/stop lifecycle
   - foreground service behavior on Android
   - batching/filtering incoming location points
3. Add map-matching/snap-to-segment pipeline with confidence scoring and configured thresholds.
4. Persist session output and increment discovery state transactionally.
5. Add recovery behavior for app restarts during active sessions.

### Phase 4 — Geodata ingestion and map rendering
1. Implement real city boundary acquisition (OSM admin boundary).
2. Implement OSM road extraction + segment split at intersections for chosen city.
3. Cache graph snapshot locally with versioning and invalidation strategy.
4. Replace synthetic map canvas with real map rendering stack (tiles + polyline segments + discovered/unexplored styling).
5. Add performance optimizations (chunked rendering, memoized selectors, viewport filtering).

### Phase 5 — Health and motivation integrations
1. Add Health Connect integration adapter:
   - permission and availability handling
   - distance/steps retrieval by day
   - fallback behavior when API unavailable
2. Persist motivation state (nudge history, weekly counters, suppression windows).
3. Implement notification scheduling and delivery controls (max 3/week, quiet behavior, opt-out in settings).

### Phase 6 — Product completeness and resilience
1. Implement onboarding flow:
   - auto-detect city
   - manual confirm/edit
   - first-run permission guidance
2. Implement settings persistence and manual reset flow for discovery data.
3. Add error boundaries/user-visible recoveries for integration failures.
4. Add data migration strategy for schema changes.

### Phase 7 — Verification depth and release readiness
1. Expand tests:
   - domain edge cases
   - integration tests for tracking/discovery persistence
   - UI tests for core tab flows
2. Add end-to-end smoke tests for Android build artifacts.
3. Add observability (crash reporting + key operational events).
4. Prepare release process:
   - signing/build config
   - staged rollout checklist
   - rollback strategy
   - privacy text and permissions rationale review

---

## 3) Suggested execution order (incremental deliverables)
1. **Milestone A:** Foundation green (type-check + CI + basic data layer).
2. **Milestone B:** Real tracking + persistent discovery updates.
3. **Milestone C:** Real city geodata + production map rendering.
4. **Milestone D:** Health Connect + notifications + resilient settings/onboarding.
5. **Milestone E:** E2E hardening, observability, and release rollout.

