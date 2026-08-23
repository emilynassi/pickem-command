// NHL season IDs are 8-digit numbers like 20252026 (the "2025-26" season).
// Live prompts get their season/gameType stamped from the NHL API's
// authoritative Game data (see findGame.ts); this date heuristic is only
// used to pick a default when nobody specifies a season explicitly, or to
// bucket historical data that predates any recorded game (see
// importLegacyWinners.ts). The NHL season typically runs October-June, so
// July is a safe cutover point between "still last season" and "next
// season hasn't started yet."
export function getCurrentSeason(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  return month >= 7 ? year * 10000 + (year + 1) : (year - 1) * 10000 + year;
}

export function formatSeasonLabel(season: number): string {
  const startYear = Math.floor(season / 10000);
  const endYear = season % 10000;
  return `${startYear}-${String(endYear).slice(-2)}`;
}

// Accepts "2025-26", "2025-2026", or the raw 8-digit form "20252026".
export function parseSeasonLabel(label: string): number | null {
  const compact = label.trim();
  if (/^\d{8}$/.test(compact)) return parseInt(compact, 10);

  const match = compact.match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return null;

  const startYear = parseInt(match[1], 10);
  const endPart = match[2];
  const endYear =
    endPart.length === 4 ? parseInt(endPart, 10) : startYear + 1;
  if (endYear !== startYear + 1) return null;

  return startYear * 10000 + endYear;
}

export const GAME_TYPE_PRESEASON = 1;
export const GAME_TYPE_REGULAR_SEASON = 2;
export const GAME_TYPE_POSTSEASON = 3;

export type GameTypeFilter = 'all' | 'preseason' | 'regular' | 'postseason';

export const GAME_TYPE_BY_FILTER: Record<
  Exclude<GameTypeFilter, 'all'>,
  number
> = {
  preseason: GAME_TYPE_PRESEASON,
  regular: GAME_TYPE_REGULAR_SEASON,
  postseason: GAME_TYPE_POSTSEASON,
};
