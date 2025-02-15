import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ScoreApiResponse, Game } from '../types/score';

// Load environment variables from .env file
dotenv.config();

const SCORE_API_URL = 'https://api-web.nhle.com/v1/score/now';

// Function to fetch the current game ID to pass to the boxscore API
// We know the Rangers ID is 3, so we can hardcode it for now
export async function fetchCurrentGameId(): Promise<number | null> {
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
    console.error('Failed to fetch current game ID:', error);
    return null;
  }
}
