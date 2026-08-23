const lockIntervals = new Map<string, NodeJS.Timeout>();

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
