# Debian-based (not alpine) so native-binary deps behave predictably in
# containers; see project-prisma-db-reverted memory for why that matters here.
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install all dependencies (including devDependencies, since ts-node is needed)
RUN npm install

# Copy the rest of the application
COPY . .

# Expose any necessary ports (not needed for Discord bot, but for completeness)
EXPOSE 3000

# Set environment variables for Datadog
ENV NODE_OPTIONS="-r dd-trace/init"

# Run the bot using ts-node directly
CMD ["sh", "-c", "npm run commands && npm start"]
