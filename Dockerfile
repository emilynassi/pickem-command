# Use Debian Bookworm slim for better Prisma compatibility
# Uses glibc (vs musl in Alpine) and OpenSSL 3.0.x (fixed segfault in 3.0.17-1~deb12u2)
# See: https://github.com/prisma/prisma/issues/27785
FROM node:22-bookworm-slim

# Update package lists and upgrade OpenSSL to ensure we have the fixed version (3.0.17-1~deb12u2 or later)
# This avoids the segfault regression in 3.0.17-1~deb12u1
# Install PostgreSQL client for health checks
RUN apt-get update && \
    apt-get upgrade -y openssl && \
    apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*

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
