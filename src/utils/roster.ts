import { RosterPlayer, RosterResponse } from '../types/roster';

const ROSTER_API_URL = 'https://api-web.nhle.com/v1/roster/NYR/current';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedRoster: RosterPlayer[] | null = null;
let cacheTimestamp = 0;

export async function fetchRangersRoster(): Promise<RosterPlayer[]> {
  const now = Date.now();
  if (cachedRoster && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRoster;
  }

  const response = await fetch(ROSTER_API_URL);
  const data = (await response.json()) as RosterResponse;

  cachedRoster = [
    ...data.forwards,
    ...data.defensemen,
    ...data.goalies,
  ];
  cacheTimestamp = now;

  return cachedRoster;
}

export function formatPlayerLabel(player: RosterPlayer): string {
  return `#${player.sweaterNumber} ${player.firstName.default} ${player.lastName.default} (${player.positionCode})`;
}
