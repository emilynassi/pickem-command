import { RangersPlayerStats } from '../types/boxscore';

export function parseTOI(toi: string): number {
  const parts = toi.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  return minutes * 60 + seconds;
}

export function findPlayerBySweater(
  stats: RangersPlayerStats,
  sweaterNumber: number
):
  | RangersPlayerStats['forwards'][number]
  | RangersPlayerStats['goalies'][number]
  | undefined {
  return (
    stats.forwards.find((p) => p.sweaterNumber === sweaterNumber) ||
    stats.defense.find((p) => p.sweaterNumber === sweaterNumber) ||
    stats.goalies.find((p) => p.sweaterNumber === sweaterNumber)
  );
}
