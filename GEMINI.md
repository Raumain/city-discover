# City Discover

## Project Overview
City Discover is a gamified city exploration mobile application built with React Native and Expo. It encourages users to walk, run, or cycle to "discover" city street segments in a "fog of war" style mapping experience. The application uses GPS to track movement, matches coordinates to street segments fetched from OpenStreetMap (via the Overpass API), and persists discovery metrics locally.

**Key Technologies & Libraries:**
- **Framework:** React Native with Expo
- **Navigation:** Expo Router (file-based routing in the `app/` directory)
- **Language:** TypeScript
- **Mapping:** `react-native-maps`
- **Location Tracking:** `expo-location`
- **Local Storage:** `expo-sqlite`
- **Notifications/Nudges:** `expo-notifications`
- **Data Sourcing:** OpenStreetMap (Overpass API)

## Architecture & Structure
The project follows a domain-driven, feature-sliced architectural pattern.

- `app/`: Contains the Expo Router file-based routing configuration (screens and layouts).
- `src/`: Contains the core business logic and features.
  - `src/domain/`: Pure domain models, types, and logic (e.g., discovery metrics, segment calculation).
  - `src/features/`: Isolated feature modules that encapsulate their own services, data adapters, and UI logic.
    - `osm/`: OpenStreetMap Overpass client, querying logic, and relation ingestion.
    - `tracking/`: GPS session management, location adapters, and map-matching logic.
    - `storage/`: SQLite schema, database migrations, and data repositories (snapshots, sessions, settings).
    - `discovery/`: Orchestrates live map updates, manages geodata caching policies, and provides hooks for the UI layer.
    - `motivation/` & `notifications/`: Handles push notifications and nudges to keep users engaged.
    - `health/`: Integrates with device health services.

## Building and Running
The project uses Bun as the primary package manager (indicated by `bun.lock`), though standard npm commands apply as defined in `package.json`.

- **Install dependencies:**
  ```bash
  bun install
  ```
- **Start the Expo development server:**
  ```bash
  bun run start
  ```
- **Run on iOS:**
  ```bash
  bun run ios
  ```
- **Run on Android:**
  ```bash
  bun run android
  ```
- **Run Tests:**
  ```bash
  bun run test
  ```
- **Watch Tests:**
  ```bash
  bun run test:watch
  ```
- **Type Checking:**
  ```bash
  bun run typecheck
  ```

## Development Conventions
- **TypeScript:** The project is strictly typed. Avoid using `any` and always verify your changes by running `bun run typecheck`.
- **Testing:** Unit tests are co-located with their respective source files using Jest (e.g., `feature.test.ts`). Always update or write new tests when making feature changes or bug fixes.
- **Database:** Local data is managed via SQLite (`src/features/storage/schema.ts`). Ensure migrations are handled carefully when making changes to the schema.
- **Styling/UI:** The UI is primarily built with custom styled components and standard React Native elements. Navigation strictly relies on Expo Router conventions.