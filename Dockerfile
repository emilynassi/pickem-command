# Use a lightweight Node.js image
FROM node:22-alpine

# Install PostgreSQL client for health checks
RUN apk add --no-cache postgresql-client

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install all dependencies (including devDependencies, since ts-node is needed)
RUN npm install

# Copy and make entrypoint script executable (before copying the rest)
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy the rest of the application
COPY . .

# Expose any necessary ports (not needed for Discord bot, but for completeness)
EXPOSE 3000

# Set environment variables for Datadog
ENV NODE_OPTIONS="-r dd-trace/init"

# Use entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
