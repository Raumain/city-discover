# Executed Plan — City Discover App

## Goal
Build an Android React Native app that motivates city walking by tracking discovered streets, showing discovery percentage on a map, and providing stats for steps, kilometers, and discovery over time.

## Your answers to planning questions

1. **City boundary denominator:** OpenStreetMap administrative boundary  
2. **Discovery rule:** Segment is discovered after >=20m tracked on that segment at walking/running speed  
3. **Movement modes counted for discovery:** Walking/running only  
4. **Data/privacy storage:** Local-only on device  
5. **Map/offline strategy:** Online tiles with cache  
6. **Period discovery definition:** Newly discovered length in period / total city street length, plus cumulative total  
7. **Android fitness source:** Health Connect with fallback estimation  
8. **Tracking model:** Manual Start/Stop walk sessions with foreground service  
9. **Motivation features:** Weekly goals + streaks + nearby unexplored suggestions  
10. **Street graph modeling:** Split roads at intersections and track discovered length per segment  
11. **Map matching strictness:** Snap within 25m + speed/outlier filters + confidence threshold  
12. **MVP tabs:** Map + Stats + Settings  
13. **Core metric preference:** Show both length-based and segment-count metrics  
14. **Headline metric choice:** Length-based primary, segment-count secondary  
15. **Distance source in stats:** Health Connect distance, fallback to step-based estimate  
16. **Nudge frequency:** Smart nudges up to 3/week  
17. **Permission strategy:** Foreground location first, background requested later only if needed  
18. **Onboarding city selection:** Auto-detect + manual confirmation/edit  
19. **Discovery persistence:** Permanent discovery with optional manual reset

## Execution plan that was carried out

1. Define architecture and data model for boundary, graph segments, tracks, and aggregates  
2. Build OSM ingestion/snapshot logic with walkable-road filtering and segment splitting  
3. Implement tracking session logic and quality filters (accuracy, duplicates, jump rejection)  
4. Implement discovery aggregation (length primary, segment secondary)  
5. Implement Health Connect distance resolver with step fallback  
6. Build Map tab with discovery metrics and street visualization  
7. Build Stats tab for day/week steps, km, period %, cumulative %  
8. Build Settings tab for permissions, setup, and behavior settings  
9. Implement motivation decision logic (weekly cap, recent-activity suppression, behind-goal nudges)  
10. Add tests and type safety checks across domain/feature modules

## Delivered result

- App scaffolded with Expo Router tab structure (**Map / Stats / Settings**)  
- Domain and feature services implemented under `src/domain` and `src/features`  
- End-to-end demo data wiring in `src/features/discovery/mockData.ts`  
- Unit tests added for discovery, stats, OSM ingestion, tracking session filters, health distance resolution, and motivation engine  
- Project validation run with Jest and TypeScript type-check
