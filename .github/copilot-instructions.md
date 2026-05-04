# Copilot Instructions for `city-discover`

## Build, test, and lint commands

- Install deps: `npm install`
- Start Expo dev server: `npm run start`
- Run Android app from Expo: `npm run android`
- Run full test suite: `npm test`
- Run a single test file: `npm test -- src/domain/discovery.test.ts`
- Type-check (used as build safety check): `npx tsc --noEmit`

## High-level architecture

- The app uses **Expo Router** with a root stack in `app/_layout.tsx` and a tab navigator in `app/(tabs)/_layout.tsx`.
- Product surfaces are split into three tab screens:
  - `app/(tabs)/index.tsx` (Map screen)
  - `app/(tabs)/stats.tsx` (Stats screen)
  - `app/(tabs)/settings.tsx` (Settings screen)
- Domain logic is intentionally kept in pure TypeScript modules under `src/domain/`:
  - `discovery.ts`: discovery thresholds, speed eligibility, length/segment metrics
  - `stats.ts`: day/week aggregation and period discovery percentage
- Feature-specific services live under `src/features/`:
  - `osm/ingestion.ts`: walkable-road filtering and graph segment generation
  - `tracking/session.ts`: session point filtering and distance computation
  - `health/healthConnect.ts`: distance resolution with steps fallback
  - `motivation/engine.ts`: nudge decision rules
- `src/features/discovery/mockData.ts` is the composition layer for the current MVP: it wires OSM ingestion, tracking, health, and motivation services into demo-ready data consumed by the tab screens.
- `components/map/CityStreetMap.tsx` renders the map visualization from segment geometry and discovery state.

## Key conventions in this repository

- Use `@/` path aliases (configured in `tsconfig.json`) instead of deep relative imports.
- Keep business logic as **pure functions** in `src/domain` and `src/features`; tab screens should mostly compose and render results.
- Discovery percent conventions are fixed:
  - **Primary metric**: discovered length / total length (`lengthPercent`)
  - **Secondary metric**: discovered segments / total segments (`segmentPercent`)
- Tracking quality filters are explicit and centralized in `src/features/tracking/session.ts` (accuracy threshold, duplicate suppression, large-jump rejection).
- Date handling for period stats is based on ISO date strings (`YYYY-MM-DD`) and UTC normalization in domain/feature utilities.
- Jest is configured for `*.test.ts` files (`jest.config.js`); add tests next to the related domain/feature modules under `src/`.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## Memory Management & Way of Working (Token Optimization)

**CRITICAL: You operate in a token-constrained environment. Your primary goal is to solve problems with maximum efficiency, precise scoping, and minimal token output.**

### 1. "No Yapping" - Strict Output Formatting
- **Diffs Only:** Never generate or rewrite an entire file if you are only modifying a few lines. Use precise Search/Replace blocks or unified diff formats.
- **Zero Fluff:** Do not provide introductions, conclusions, or lengthy justifications for your code unless explicitly requested. Output only the necessary code or terminal commands.
- **Step-by-step:** Do not attempt to solve a massive architectural problem in one giant response. Break it down, execute one step, verify, then proceed.

### 2. Intelligent Context Management (State Offloading)
- If a task requires multiple steps or complex context, **do NOT rely on the chat history**.
- Create or update a `MEMORY.md` or `STATE.md` file at the root of the project to document your progress, architecture decisions, and the current goal.
- Before starting a new sub-task, read this state file to regain context. This allows the user to safely clear the session history without you losing track of the broader task.

### 3. Strict File Scoping (The Shield)
- Never scan, read, or grep compiled files, build directories (e.g., `dist`, `build`, `out`), or lock files (e.g., `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) unless it is strictly impossible to proceed otherwise.
- Only request and read the specific source files necessary for the immediate task.

### 4. Anti-Looping Mechanism
- If you encounter the same error more than twice after attempting a fix, **STOP**. Do not blindly attempt the same fix or hallucinate random changes.
- State clearly: *"I am stuck in a loop. Here is my current hypothesis. Please advise or provide more context."*
- Wait for user intervention before proceeding.