# Use a lightweight Node.js image
FROM node:18-alpine

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

# Run the bot using ts-node directly
CMD ["npm", "start"]
