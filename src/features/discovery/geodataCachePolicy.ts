import type { PersistedCitySnapshot } from '@/src/features/storage/repositories/citySnapshotRepository';

export type GeodataCacheState = 'missing' | 'fresh' | 'stale' | 'incompatible';

type GeodataCachePolicyInput = {
  nowIso: string;
  maxAgeHours: number;
  requiredSchemaVersion: number;
  cityKey: string;
};

export function evaluateGeodataCachePolicy(
  snapshot: PersistedCitySnapshot | null,
  policy: GeodataCachePolicyInput
): GeodataCacheState {
  if (!snapshot) {
    return 'missing';
  }

  if (snapshot.cityKey !== policy.cityKey || snapshot.schemaVersion !== policy.requiredSchemaVersion) {
    return 'incompatible';
  }

  const ageMs = Date.parse(policy.nowIso) - Date.parse(snapshot.fetchedAtIso);
  const maxAgeMs = policy.maxAgeHours * 60 * 60 * 1000;
  if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) {
    return 'stale';
  }

  return 'fresh';
}
