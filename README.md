# ChatGPT MCP Server
[![smithery badge](https://smithery.ai/badge/@Toowiredd/chatgpt-mcp-server)](https://smithery.ai/server/@Toowiredd/chatgpt-mcp-server)

A Model Context Protocol (MCP) server that provides Docker management capabilities through a custom GPT interface.

## Features

- Docker container management through natural language
- Built on the Model Context Protocol (MCP)
- TypeScript implementation
- Containerized deployment
- Robust error handling and graceful shutdown
- Resource management and port handling
- Rate limiting and API key authentication

## Setup
### Installing via Smithery

To install ChatGPT MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@Toowiredd/chatgpt-mcp-server):

```bash
npx -y @smithery/cli install @Toowiredd/chatgpt-mcp-server --client claude
```

### Manual Installation
1. Clone the repository
```bash
git clone https://github.com/toowiredd/chatgpt-mcp-server.git
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
npm run docker:build
```

2. Run the container
```bash
npm run docker:run
```

Or manually:
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

## Resource Management

The server implements robust resource management:

- Graceful shutdown on process signals (SIGINT, SIGTERM, SIGQUIT)
- Connection tracking and management
- Request timeout handling
- Port conflict detection
- Keep-alive connection management
- Active request tracking and graceful completion

### Shutdown Process

1. The server initiates graceful shutdown on process signals
2. New connections are rejected
3. Active requests are allowed to complete (with timeout)
4. Keep-alive connections are closed
5. Server ports are properly released
6. Resources are properly released

### Error Handling

- Port conflicts are detected and reported
- Unhandled rejections and exceptions are caught
- Network errors are properly handled
- Resource leaks are prevented through proper handling
- Timeouts ensure the server doesn't hang during shutdown

## License

MIT
