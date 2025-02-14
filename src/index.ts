#!/usr/bin/env node
import { DockerService } from './services/docker.service.js';
import { HttpServer } from './servers/http.server.js';
import { McpServer } from './servers/mcp.server.js';

const SHUTDOWN_TIMEOUT = 15000; // 15 seconds

class DockerAssistant {
  private httpServer: HttpServer;
  private mcpServer: McpServer;
  private isShuttingDown = false;
  private shutdownTimer: NodeJS.Timeout | null = null;

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

      this.setupSignalHandlers();
    } catch (error) {
      console.error('Failed to start Docker Assistant:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private setupSignalHandlers(): void {
    // Handle graceful shutdown signals
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          console.log('Forced shutdown initiated');
          process.exit(1);
        }

        console.log(`\nReceived ${signal}, starting graceful shutdown...`);
        this.isShuttingDown = true;

        try {
          await this.shutdown();
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      await this.cleanup();
      process.exit(1);
    });
  }

  private async shutdown(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Set a timeout for the shutdown process
      this.shutdownTimer = setTimeout(() => {
        console.warn('Shutdown timeout reached, forcing exit');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);

      this.cleanup()
        .then(() => {
          if (this.shutdownTimer) {
            clearTimeout(this.shutdownTimer);
          }
          resolve();
        })
        .catch((error) => {
          if (this.shutdownTimer) {
            clearTimeout(this.shutdownTimer);
          }
          reject(error);
        });
    });
  }

  private async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.httpServer.stop(),
        this.mcpServer.stop()
      ]);
      console.log('Docker Assistant stopped successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}

// Initialize and start the application
const assistant = new DockerAssistant();

// Attach error handler to the start promise
assistant.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
