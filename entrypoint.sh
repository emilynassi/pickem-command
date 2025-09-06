#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting entrypoint script..."

# Function to wait for postgres
wait_for_postgres() {
    echo "Waiting for PostgreSQL to be ready..."
    
    # Extract database connection info from DATABASE_URL or use defaults
    DB_HOST=${DB_HOST:-postgres}
    DB_PORT=${DB_PORT:-5432}
    DB_USER=${DB_USER:-pickem_user}
    
    # Wait for PostgreSQL to be available
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 2
    done
    
    echo "PostgreSQL is ready!"
}

# Function to run Prisma setup
setup_prisma() {
    echo "Running Prisma setup..."
    npm run prisma:setup
    echo "Prisma setup completed!"
}

# Function to deploy commands
deploy_commands() {
    echo "Deploying Discord commands..."
    npm run commands
    echo "Discord commands deployed!"
}

# Function to start the application
start_app() {
    echo "Starting the application..."
    npm start
}

# Main execution flow
main() {
    echo "=== Discord Bot Startup ==="
    
    # Wait for dependencies
    wait_for_postgres
    
    # Setup database
    setup_prisma
    
    # Deploy Discord commands
    deploy_commands
    
    # Start the bot
    start_app
}

# Run main function
main "$@"
