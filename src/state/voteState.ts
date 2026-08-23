export interface VoteData {
  upvotes: Set<string>;
  downvotes: Set<string>;
}

export interface VotePlayer {
  sweaterNumber: number;
  name: string;
}

const votes = new Map<string, VoteData>();
const votePrompts = new Map<string, string>();
const votePlayers = new Map<string, VotePlayer>();
const lockIntervals = new Map<string, NodeJS.Timeout>();

export function getVote(messageId: string): VoteData | undefined {
  return votes.get(messageId);
}

export function setVote(messageId: string, data: VoteData): void {
  votes.set(messageId, data);
}

export function getVotePrompt(channelId: string): string | undefined {
  return votePrompts.get(channelId);
}

export function setVotePrompt(channelId: string, prompt: string): void {
  votePrompts.set(channelId, prompt);
}

export function getVotePlayer(channelId: string): VotePlayer | undefined {
  return votePlayers.get(channelId);
}

export function setVotePlayer(channelId: string, player: VotePlayer): void {
  votePlayers.set(channelId, player);
}

// Ensures at most one lock-polling interval runs per channel: starting a new
// one (e.g. from running /vote again before the previous prompt locked)
// clears whatever was already running for that channel.
export function setLockInterval(
  channelId: string,
  interval: NodeJS.Timeout
): void {
  clearLockInterval(channelId);
  lockIntervals.set(channelId, interval);
}

export function clearLockInterval(channelId: string): void {
  const existing = lockIntervals.get(channelId);
  if (existing) {
    clearInterval(existing);
    lockIntervals.delete(channelId);
  }
}
