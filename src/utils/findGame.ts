import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ScoreApiResponse, Game } from '../types/score';
import { GameBoxScore } from '../types/boxscore';
import logger from './logger';

// Load environment variables from .env file
dotenv.config();

const getToday = (): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Los_Angeles',
  };
  // Using 'en-CA' locale returns the date in YYYY-MM-DD format.
  return new Intl.DateTimeFormat('en-CA', options).format(new Date());
};

// Function to fetch the current game ID to pass to the boxscore API
// We know the Rangers ID is 3, so we can hardcode it for now
export async function fetchCurrentGameId(): Promise<number | null> {
  const today = getToday();
  const SCORE_API_URL = `https://api-web.nhle.com/v1/score/${today}`;
  logger.info('Fetching game data from:', SCORE_API_URL);

  try {
    let data: ScoreApiResponse;

    if (process.env.USE_MOCK_API === 'true') {
      // Read the mock JSON file
      const mockFilePath = path.join(__dirname, '../mocks/score.json');
      data = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
    } else {
      // Fetch data from the real API
      const response = await fetch(SCORE_API_URL);
      data = (await response.json()) as ScoreApiResponse;
    }

    // Get all the data from the response which should look like the type of ScoreApiResponse
    const game = data.games.find(
      (game: Game) => game.awayTeam.id === 3 || game.homeTeam.id === 3
    );
    return game ? game.id : null;
  } catch (error) {
    logger.error('Failed to fetch current game ID:', error);
    return null;
  }
}

//reusable function to fetch box score data
export async function fetchBoxScore(gameId: number): Promise<any> {
  try {
    let data: GameBoxScore;

    if (process.env.USE_MOCK_API === 'true') {
      // Read the mock JSON file
      const mockFilePath = path.join(__dirname, '../mocks/boxscore.json');
      data = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
    } else {
      // Fetch data from the real API
      const response = await fetch(
        `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`
      );
      data = (await response.json()) as GameBoxScore;
    }

    return data;
  } catch (error) {
    logger.error('Failed to fetch box score:', error);
    return null;
  }
}
