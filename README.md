# Pickem Command Bot

This repository contains a Discord bot that supports voting on predictions using commands. The bot is containerized via Docker and is structured for easy addition of new commands.

## Table of Contents

- [Installation](#installation)
- [Running with Docker](#running-with-docker)
- [Adding New Commands](#adding-new-commands)
- [Available Commands](#available-commands)
- [Configuration](#configuration)

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/pickem-command.git
   cd pickem-command
   ```
2. **Install Dependencies:**
   ```bash
    npm install
   ```

## Running with Docker

The bot needs a Postgres database (votes/results/winners persist there via
Drizzle). `docker-compose.yml` includes a `postgres` service alongside the
bot, so the usual flow is:

1. **Set required env vars** (see `.env.example`): `DISCORD_TOKEN`,
   `DISCORD_CLIENT_ID`, `GUILD_ID`, and `DATABASE_URL`. If you don't set
   `DATABASE_URL`, `docker-compose.yml` defaults it to point at the bundled
   `postgres` service (`postgres://pickem:pickem@postgres:5432/pickem`) - fine
   for local/dev use, but set real credentials for anything long-lived.
2. **Start everything:**
   ```bash
   docker-compose up -d
   ```
   On startup the bot container runs pending Drizzle migrations
   (`npm run db:migrate`) before registering commands and logging in, so a
   fresh Postgres gets its schema created automatically.
3. **Data persistence:** Postgres data lives in the named volume
   `pickem-postgres-data`. It survives `docker-compose down` and container
   rebuilds/redeploys - only `docker-compose down -v` (or manually clearing
   the volume) wipes it.
4. **Access the Bot:**
   The bot will be running and can be invited to your Discord server.

## Available Commands

The bot currently supports the following commands:

- `/vote`: Vote on a TOI (Time On Ice) prediction. This command uses interactive embeds and buttons for recording Over and Under votes.
- `/checkwinner`: Compares the prompt TOI to the actual final TOI (using game data) and announces winners for the Over/Under prediction in an embed.
