# Phase 1 refactor — kickoff prompt

Paste this into a fresh chat when ready to start Phase 1 of the
pickem-command refactor roadmap (dedup/cleanup, no behavior change).

---

```
Work on Phase 1 of the pickem-command refactor roadmap (see memory:
project-refactor-db-roadmap for full context — this repo has auto-loaded
memory). Any-player-selection (Phase 0) is committed on
feature/any-player-selection; branch this work fresh off main once that's
merged. No behavior change in this phase — pure extraction/cleanup.

Do these three extractions:
1. `findPlayerBySweater(stats, sweaterNumber)` — pulls out the identical
   forwards/defense/goalies .find() chain currently duplicated in
   checkCurrentToi.ts, checkWinner.ts, and lockVotes.ts.
2. `resolveUsernames(client, userIds)` — pulls out the repeated
   Discord username-from-ID-list fetch duplicated in vote.ts,
   checkWinner.ts, lockVotes.ts, and compileLeaderboard.ts.
3. `src/state/voteState.ts` — move the loose exported Maps in vote.ts
   (votes, votePrompts, votePlayers) into one module with named
   accessors (getVote, setVotePlayer, etc.), updating the other files
   that currently import them directly from vote.ts.

Also fix while you're in these files:
- Replace stray console.log/console.error in vote.ts, checkWinner.ts,
  lockVotes.ts, findGame.ts with the existing winston `logger`
  (already used in index.ts).
- vote.ts's setInterval polling loop (checkApiAndLockVotes) isn't
  tracked per channel — running /vote twice in the same channel before
  the first prompt locks starts a second competing interval. Track
  the interval id (e.g. in voteState.ts) and clear any existing one
  before starting a new one.

Verify: typecheck (npx tsc --noEmit), lint, boot the dev bot
(npm run dev) and run through vote -> lock -> checkwinner ->
compileleaderboard end-to-end to confirm no behavior changed.

Commit when done, but don't open the PR without checking with me first.
```

---

**Note:** Phase 1 is meant to branch off `main` *after* the
any-player-selection PR merges (no-stacking decision). If it hasn't
merged yet when you pick this up, either merge it first or tell the
new session to branch off `feature/any-player-selection` instead as a
one-off exception.
