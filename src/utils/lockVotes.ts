import { voteMessages } from '../utils/votedMessages';
import { GameBoxScore } from '../types/boxscore';

export async function checkApiAndLockVotes(channel: any) {
  try {
    const response = await fetch(
      'https://api-web.nhle.com/v1/gamecenter/2024020876/boxscore'
    );
    const data: GameBoxScore = (await response.json()) as GameBoxScore;
    console.log(data);

    // Check the condition to lock votes
    if (data.gameState === 'LIVE') {
      const messageId = voteMessages.get(channel.id);
      if (messageId) {
        const message = await channel.messages.fetch(messageId);
        await message.edit({ components: [] }); // Remove buttons
        await channel.send('Voting is now closed because the game is live.');
      }
    }
  } catch (error) {
    console.error('Failed to check API and lock votes:', error);
  }
}
