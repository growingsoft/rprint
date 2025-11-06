#!/bin/bash

echo "RPrint Setup Script"
echo "==================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "Node version: $(node --version)"
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies
echo ""
echo "Installing server dependencies..."
cd packages/server
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating server .env file..."
    cp .env.example .env
    echo "Please edit packages/server/.env and set JWT_SECRET!"
fi

cd ../..

# Install windows-service dependencies
echo ""
echo "Installing Windows service dependencies..."
cd packages/windows-service
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating Windows service .env file..."
    cp .env.example .env
    echo "Please edit packages/windows-service/.env and set SERVER_URL and API_KEY!"
fi

cd ../..

# Install client dependencies
echo ""
echo "Installing client dependencies..."
cd packages/client
npm install

cd ../..

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit packages/server/.env and set JWT_SECRET"
echo "2. Start the server: cd packages/server && npm run dev"
echo "3. Register a worker using the API"
echo "4. Edit packages/windows-service/.env with server URL and API key"
echo "5. Start the Windows service: cd packages/windows-service && npm run dev"
echo "6. Start the client: cd packages/client && npm run dev"
echo ""
echo "See README.md for detailed instructions."
