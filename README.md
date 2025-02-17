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

1. **Build the Docker Image:**
   ```bash
   docker build -t pickem-command .
   ```
2. **Run the Docker Container:**
   ```bash
    docker run -d --name pickem-command -e DISCORD_TOKEN=your_token_here pickem-command
   ```
   Replace `your_token_here` with your actual Discord bot token.
3. **Access the Bot:**
   The bot will be running and can be invited to your Discord server.

## Available Commands

The bot currently supports the following commands:

- `/vote`: Vote on a TOI (Time On Ice) prediction. This command uses interactive embeds and buttons for recording Over and Under votes.
- `/checkwinner`: Compares the prompt TOI to the actual final TOI (using game data) and announces winners for the Over/Under prediction in an embed.
