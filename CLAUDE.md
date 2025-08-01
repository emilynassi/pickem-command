# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm start` - Start the bot with Datadog tracing enabled
- `npm run commands` - Deploy Discord slash commands to the configured server
- `npm run lint` - Run ESLint with auto-fix on the codebase

### Docker
- `docker-compose up` - Start the bot with Datadog agent for local development
- `docker build -t pickem-command .` - Build the Docker image

## Architecture Overview

This is a TypeScript-based Discord bot for sports game predictions (NHL/NBA) with the following architecture:

### Command System
The bot uses a modular command structure where each command is a separate file in `src/commands/utility/`. Commands are dynamically loaded at startup and stored in the client's command collection. Each command exports:
- `data`: SlashCommandBuilder configuration
- `execute`: Async function handling the interaction

### State Management
The bot maintains in-memory state using Maps:
- `votes`: Tracks user votes by prompt ID
- `votedUsers`: Tracks which users have voted on which prompts
- `prompts`: Stores prompt information for vote tallying

### External Integration
The bot fetches game data from an external API (configured via CURRENT_TOI_API_URL) to get real-time sports data for predictions.

### Interaction Flow
1. Admin creates a vote prompt with team options
2. Users vote via button interactions
3. Votes are locked at game time
4. Winners are determined based on actual game results
5. Results are tallied and displayed

### Key Patterns
- **Extended Discord Client**: Custom interface extends Discord.js Client with command collection
- **Button-based Voting**: Uses Discord button components for interactive voting
- **Scheduled Tasks**: Implements vote locking based on game start times
- **Structured Logging**: Winston logger with Datadog integration for production monitoring
- **Error Handling**: User-friendly error messages with detailed logging

### Environment Configuration
Required environment variables (see .env.example):
- Discord credentials (BOT_TOKEN, APP_ID, GUILD_ID)
- API endpoints (CURRENT_TOI_API_URL)
- Datadog configuration (DD_API_KEY, DD_ENV, DD_SERVICE, DD_VERSION)

### TypeScript Configuration
- Strict mode enabled
- Target: ES6 with CommonJS modules
- Source in `src/`, compiled to `dist/`
- All Discord.js types properly extended