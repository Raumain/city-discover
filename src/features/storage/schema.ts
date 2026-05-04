export const STORAGE_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS city_snapshot (
    city_name TEXT NOT NULL,
    area_km2 REAL NOT NULL,
    total_street_length_meters REAL NOT NULL,
    city_key TEXT NOT NULL DEFAULT '',
    fetched_at_iso TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'seed',
    schema_version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS city_segments (
    id TEXT PRIMARY KEY,
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    length_meters REAL NOT NULL,
    from_x REAL NOT NULL,
    from_y REAL NOT NULL,
    to_x REAL NOT NULL,
    to_y REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS discovery_progress (
    segment_id TEXT PRIMARY KEY,
    discovered_meters REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS walk_session_summaries (
    id TEXT PRIMARY KEY,
    started_at_iso TEXT NOT NULL,
    ended_at_iso TEXT NOT NULL,
    accepted_point_count INTEGER NOT NULL,
    distance_meters REAL NOT NULL,
    discovered_meters REAL NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS active_walk_session (
    id TEXT PRIMARY KEY,
    started_at_iso TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS walk_session_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy_meters REAL NOT NULL,
    timestamp_iso TEXT NOT NULL,
    speed_mps REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS nudges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_key TEXT NOT NULL,
    sent_at_iso TEXT NOT NULL,
    reason TEXT NOT NULL,
    suggestion TEXT NOT NULL
  )`,
];
