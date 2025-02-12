import { voteMessages } from '../utils/votedMessages';
import { GameBoxScore } from '../types/boxscore';
import { fetchCurrentGameId } from './findGame';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export async function checkApiAndLockVotes(channel: any): Promise<boolean> {
  try {
    // Fetch the current game ID
    const gameId = await fetchCurrentGameId();
    if (!gameId) {
      console.error('No current game ID found.');
      return false;
    }

    let data: GameBoxScore;

    if (process.env.USE_MOCK_API === 'true') {
      // Read the mock JSON file
      const mockFilePath = path.resolve(__dirname, '../mocks/boxscore.json');
      data = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
    } else {
      // Fetch data from the real API
      const response = await fetch(
        `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`
      );
      data = (await response.json()) as GameBoxScore;
    }

    console.log(data);

    // Check the condition to lock votes
    if (data.gameState === 'LIVE' || data.gameState === 'OFF') {
      const messageId = voteMessages.get(channel.id);
      if (messageId) {
        const message = await channel.messages.fetch(messageId);
        await message.edit({ components: [] }); // Remove buttons
        await channel.send('Voting is now closed because the game is live.');
        return true; // Indicate that the votes are locked
      }
    }
  } catch (error) {
    console.error('Failed to check API and lock votes:', error);
  }
  return false; // Indicate that the votes are not locked
}
