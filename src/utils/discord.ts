import { Client } from 'discord.js';

export async function resolveUsernames(
  client: Client,
  userIds: string[],
  fallback: (id: string) => string = (id) => id
): Promise<string[]> {
  return Promise.all(
    userIds.map(async (id) => {
      try {
        const user = await client.users.fetch(id);
        return user.username;
      } catch {
        return fallback(id);
      }
    })
  );
}
