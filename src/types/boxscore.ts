export interface GameBoxScore {
  id: number;
  season: number;
  gameType: number;
  limitedScoring: boolean;
  gameDate: string;
  venue: Venue;
  venueLocation: VenueLocation;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: TvBroadcast[];
  gameState: string;
  gameScheduleState: string;
  periodDescriptor: PeriodDescriptor;
  regPeriods: number;
  awayTeam: TeamDetails;
  homeTeam: TeamDetails;
  clock: GameClock;
  playerByGameStats: PlayerGameStats;
  summary?: Record<string, unknown>; // Placeholder for summary structure
  gameOutcome: GameOutcome;
}

interface Venue {
  default: string;
}

interface VenueLocation {
  default: string;
}

interface TvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
}

interface PeriodDescriptor {
  number: number;
  periodType: string;
  maxRegulationPeriods: number;
}

interface TeamDetails {
  id?: number;
  commonName?: { default: string };
  abbrev?: string;
  score?: number;
  sog?: number;
  logo?: string;
  darkLogo?: string;
  placeName?: { default: string };
  placeNameWithPreposition?: { default: string; fr?: string };
}

interface GameClock {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
}

interface PlayerGameStats {
  awayTeam: TeamPlayerStats;
  homeTeam: TeamPlayerStats;
}

interface TeamPlayerStats {
  forwards: PlayerStats[];
  defense: PlayerStats[];
  goalies: GoalieStats[];
}

interface PlayerStats {
  playerId: number;
  sweaterNumber: number;
  name: { default: string; cs?: string; fi?: string; sk?: string };
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  hits: number;
  powerPlayGoals: number;
  sog: number;
  faceoffWinningPctg: number;
  toi: string;
  blockedShots: number;
  shifts: number;
  giveaways: number;
  takeaways: number;
}

interface GoalieStats {
  playerId: number;
  sweaterNumber: number;
  name: { default: string; cs?: string; fi?: string; sk?: string };
  position: string;
  evenStrengthShotsAgainst: string;
  powerPlayShotsAgainst: string;
  shorthandedShotsAgainst: string;
  saveShotsAgainst: string;
  savePctg?: number;
  evenStrengthGoalsAgainst: number;
  powerPlayGoalsAgainst: number;
  shorthandedGoalsAgainst: number;
  pim: number;
  goalsAgainst: number;
  toi: string;
  starter: boolean;
  decision?: string;
  shotsAgainst: number;
  saves: number;
}

interface GameOutcome {
  lastPeriodType: string;
}

export class RangersPlayerStats {
  forwards: PlayerStats[];
  defense: PlayerStats[];
  goalies: GoalieStats[];

  constructor(boxscore: GameBoxScore) {
    if (boxscore.awayTeam.id === 3) {
      this.forwards = boxscore.playerByGameStats.awayTeam.forwards;
      this.defense = boxscore.playerByGameStats.awayTeam.defense;
      this.goalies = boxscore.playerByGameStats.awayTeam.goalies;
    } else {
      this.forwards = boxscore.playerByGameStats.homeTeam.forwards;
      this.defense = boxscore.playerByGameStats.homeTeam.defense;
      this.goalies = boxscore.playerByGameStats.homeTeam.goalies;
    }
  }
}
