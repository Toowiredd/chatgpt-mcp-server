import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { DockerService } from '../services/docker.service.js';
import { ConfigService } from '../services/config.service.js';

const SHUTDOWN_TIMEOUT = 5000; // 5 seconds

export class McpServer {
  private server: Server;
  private dockerService: DockerService;
  private config: ConfigService;
  private requestCount: number = 0;
  private lastRequestTime: number = Date.now();
  private transport: StdioServerTransport | null = null;
  private activeRequests = new Set<Promise<any>>();
  private isShuttingDown = false;

  constructor(dockerService: DockerService) {
    this.dockerService = dockerService;
    this.config = ConfigService.getInstance();
    this.server = new Server(
      {
        name: 'docker-assistant-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  private checkRateLimit(): void {
    if (this.isShuttingDown) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Server is shutting down'
      );
    }

    const now = Date.now();
    if (now - this.lastRequestTime > this.config.rateLimitWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    this.requestCount++;
    if (this.requestCount > this.config.rateLimitRequests) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Rate limit exceeded. Please try again later.'
      );
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    // Handle transport errors
    process.on('error', (error) => {
      console.error('[Transport Error]', error);
      this.stop().catch(console.error);
    });
  }

  private async wrapRequest<T>(request: Promise<T>): Promise<T> {
    this.activeRequests.add(request);
    try {
      return await request;
    } finally {
      this.activeRequests.delete(request);
    }
  }

  private setupTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'containers_list',
          description: 'List all Docker containers',
          inputSchema: {
            type: 'object',
            properties: {
              all: {
                type: 'boolean',
                description: 'Show all containers (including stopped ones)',
              },
            },
          },
        },
        {
          name: 'container_create',
          description: 'Create and start a new Docker container',
          inputSchema: {
            type: 'object',
            properties: {
              image: {
                type: 'string',
                description: 'Docker image name',
              },
              name: {
                type: 'string',
                description: 'Container name',
              },
              ports: {
                type: 'array',
                items: { type: 'string' },
                description: 'Port mappings (e.g. ["80:80"])',
              },
              env: {
                type: 'array',
                items: { type: 'string' },
                description: 'Environment variables (e.g. ["KEY=value"])',
              },
            },
            required: ['image'],
          },
        },
        {
          name: 'container_stop',
          description: 'Stop a running container',
          inputSchema: {
            type: 'object',
            properties: {
              container: {
                type: 'string',
                description: 'Container ID or name',
              },
            },
            required: ['container'],
          },
        },
        {
          name: 'container_start',
          description: 'Start a stopped container',
          inputSchema: {
            type: 'object',
            properties: {
              container: {
                type: 'string',
                description: 'Container ID or name',
              },
            },
            required: ['container'],
          },
        },
        {
          name: 'container_remove',
          description: 'Remove a container',
          inputSchema: {
            type: 'object',
            properties: {
              container: {
                type: 'string',
                description: 'Container ID or name',
              },
              force: {
                type: 'boolean',
                description: 'Force remove running container',
              },
            },
            required: ['container'],
          },
        },
        {
          name: 'container_logs',
          description: 'Get container logs',
          inputSchema: {
            type: 'object',
            properties: {
              container: {
                type: 'string',
                description: 'Container ID or name',
              },
              tail: {
                type: 'number',
                description: 'Number of lines to show from the end',
              },
            },
            required: ['container'],
          },
        },
        {
          name: 'container_exec',
          description: 'Execute a command in a running container',
          inputSchema: {
            type: 'object',
            properties: {
              container: {
                type: 'string',
                description: 'Container ID or name',
              },
              command: {
                type: 'string',
                description: 'Command to execute',
              },
            },
            required: ['container', 'command'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.checkRateLimit();

      const toolRequest = (async () => {
        try {
          switch (request.params.name) {
            case 'containers_list': {
              const { all } = request.params.arguments as { all?: boolean };
              const output = await this.dockerService.listContainers(all);
              return {
                content: [{ type: 'text', text: output }],
              };
            }

            case 'container_create': {
              const { image, name, ports, env } = request.params.arguments as {
                image: string;
                name?: string;
                ports?: string[];
                env?: string[];
              };

              const output = await this.dockerService.createContainer({
                image,
                name,
                ports,
                env,
              });
              return {
                content: [{ type: 'text', text: `Container created: ${output}` }],
              };
            }

            case 'container_stop': {
              const { container } = request.params.arguments as { container: string };
              const output = await this.dockerService.stopContainer(container);
              return {
                content: [{ type: 'text', text: `Container stopped: ${output}` }],
              };
            }

            case 'container_start': {
              const { container } = request.params.arguments as { container: string };
              const output = await this.dockerService.startContainer(container);
              return {
                content: [{ type: 'text', text: `Container started: ${output}` }],
              };
            }

            case 'container_remove': {
              const { container, force } = request.params.arguments as {
                container: string;
                force?: boolean;
              };
              const output = await this.dockerService.removeContainer(container, force);
              return {
                content: [{ type: 'text', text: `Container removed: ${output}` }],
              };
            }

            case 'container_logs': {
              const { container, tail } = request.params.arguments as {
                container: string;
                tail?: number;
              };
              const output = await this.dockerService.getContainerLogs(container, tail);
              return {
                content: [{ type: 'text', text: output }],
              };
            }

            case 'container_exec': {
              const { container, command } = request.params.arguments as {
                container: string;
                command: string;
              };
              const output = await this.dockerService.execInContainer(container, command);
              return {
                content: [{ type: 'text', text: output }],
              };
            }

            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
              );
          }
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            ErrorCode.InternalError,
            `Error executing Docker command: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })();

      return this.wrapRequest(toolRequest);
    });
  }

  async start(): Promise<void> {
    try {
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);
      console.log('MCP server running on stdio');
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true;

    return new Promise<void>(async (resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        console.warn('MCP server shutdown timeout reached');
        resolve();
      }, SHUTDOWN_TIMEOUT);

      try {
        // Wait for active requests to complete
        if (this.activeRequests.size > 0) {
          console.log(`Waiting for ${this.activeRequests.size} active requests to complete...`);
          await Promise.race([
            Promise.all(this.activeRequests),
            new Promise(r => setTimeout(r, SHUTDOWN_TIMEOUT))
          ]);
        }

        // Clean up resources
        if (this.transport) {
          await this.server.close();
          this.transport = null;
        }

        clearTimeout(timeoutHandle);
        resolve();
      } catch (error) {
        clearTimeout(timeoutHandle);
        console.error('Error during MCP server shutdown:', error);
        reject(error);
      }
    });
  }
}