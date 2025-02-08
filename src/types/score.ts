export interface ApiResponse {
  prevDate: string;
  currentDate: string;
  nextDate: string;
  gameWeek: any[]; // Can be replaced with actual structure if provided
  oddsPartners: any[]; // Can be replaced with actual structure if provided
  games: Game[];
}

interface Game {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  venue: Venue;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  neutralSite: boolean;
  gameState: string;
  gameScheduleState: string;
  gameCenterLink: string;
  tvBroadcasts: TvBroadcast[];
  awayTeam: Team;
  homeTeam: Team;
  clock?: GameClock; // Optional, only present in live games
  period?: number;
  periodDescriptor?: PeriodDescriptor;
  teamLeaders: TeamLeader[];
  goals: any[];
  ticketsLink?: string;
  ticketsLinkFr?: string;
}

interface Venue {
  default: string;
}

interface TvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
}

interface Team {
  id: number;
  name: { default: string };
  abbrev: string;
  score?: number; // Only present in live games
  sog?: number; // Shots on goal, only present in live games
  record?: string; // Only present in future games
  logo: string;
  odds?: TeamOdds[];
}

interface TeamOdds {
  providerId: number;
  value: string;
}

interface GameClock {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
}

interface PeriodDescriptor {
  number: number;
  periodType: string;
  maxRegulationPeriods: number;
}

interface TeamLeader {
  id: number;
  firstName: { default: string; cs?: string; sk?: string; fi?: string };
  lastName: { default: string; cs?: string; sk?: string; fi?: string };
  headshot: string;
  teamAbbrev: string;
  sweaterNumber: number;
  position: string;
  category: "goals" | "assists" | "wins";
  value: number;
}
