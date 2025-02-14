# ChatGPT MCP Server

A Model Context Protocol (MCP) server that provides Docker management capabilities through a custom GPT interface.

## Features

- Docker container management through natural language
- Built on the Model Context Protocol (MCP)
- TypeScript implementation
- Containerized deployment

## Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/chatgpt-mcp-server.git
cd chatgpt-mcp-server
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Build the project
```bash
npm run build
```

## Running with Docker

1. Build the container
```bash
docker build -t chatgpt-mcp-server .
```

2. Run the container
```bash
docker run -d \
  -p 3001:3001 \
  --env-file .env \
  -v /var/run/docker.sock:/var/run/docker.sock \
  chatgpt-mcp-server
```

## Development

- `npm run build` - Build the TypeScript code
- `npm run watch` - Watch for changes and rebuild
- `npm run inspector` - Run the MCP inspector tool

## Environment Variables

- `API_KEY` - API authentication key
- `HTTP_PORT` - Server port (default: 3001)
- `RATE_LIMIT_REQUESTS` - Maximum requests per window
- `RATE_LIMIT_WINDOW` - Window size in milliseconds
