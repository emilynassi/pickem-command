import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ScoreApiResponse, Game } from '../types/score';
import { GameBoxScore } from '../types/boxscore';

// Load environment variables from .env file
dotenv.config();

//get today's date in YYYY-MM-DD format
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SCORE_API_URL = `https://api-web.nhle.com/v1/score/${formatDate(today)}`;

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
    console.error('Failed to fetch box score:', error);
    return null;
  }
}
