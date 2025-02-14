#!/usr/bin/env node
import { DockerService } from './services/docker.service.js';
import { HttpServer } from './servers/http.server.js';
import { McpServer } from './servers/mcp.server.js';

class DockerAssistant {
  private httpServer: HttpServer;
  private mcpServer: McpServer;

  constructor() {
    const dockerService = new DockerService();
    this.httpServer = new HttpServer(dockerService);
    this.mcpServer = new McpServer(dockerService);
  }

  async start(): Promise<void> {
    try {
      await Promise.all([
        this.httpServer.start(),
        this.mcpServer.start()
      ]);
      console.log('Docker Assistant is running');

      process.on('SIGINT', async () => {
        await this.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to start Docker Assistant:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      await Promise.all([
        this.httpServer.stop(),
        this.mcpServer.stop()
      ]);
      console.log('Docker Assistant stopped');
    } catch (error) {
      console.error('Error stopping Docker Assistant:', error);
      throw error;
    }
  }
}

const assistant = new DockerAssistant();
assistant.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
