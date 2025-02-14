import * as http from 'http';
import { DockerService } from '../services/docker.service.js';
import { ConfigService } from '../services/config.service.js';

const SHUTDOWN_TIMEOUT = 10000; // 10 seconds

export class HttpServer {
  private server: http.Server;
  private dockerService: DockerService;
  private config: ConfigService;
  private requestCount: number = 0;
  private lastRequestTime: number = Date.now();
  private activeConnections = new Set<http.ServerResponse>();

  constructor(dockerService: DockerService) {
    this.dockerService = dockerService;
    this.config = ConfigService.getInstance();
    this.server = http.createServer(this.handleRequest.bind(this));

    // Track connections for graceful shutdown
    this.server.on('connection', (socket) => {
      socket.setKeepAlive(true);
      socket.setTimeout(120000); // 2 minute timeout
    });

    // Handle server errors
    this.server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${this.config.httpPort} is already in use`);
        process.exit(1);
      } else {
        console.error('HTTP Server error:', error);
      }
    });
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastRequestTime > this.config.rateLimitWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    this.requestCount++;
    return this.requestCount <= this.config.rateLimitRequests;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Track active connections
    this.activeConnections.add(res);
    res.on('finish', () => {
      this.activeConnections.delete(res);
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Handle health check without requiring API key
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'OK' }));
      return;
    }

    // Handle root path
    if (req.url === '/' || req.url === '/api') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'running' }));
      return;
    }

    // Check API key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== this.config.apiKey) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid API key' }));
      return;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
      return;
    }

    try {
      if (req.url?.startsWith('/api/containers')) {
        if (req.method === 'GET') {
          const output = await this.dockerService.listContainers();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ containers: output.trim().split('\n') }));
        } else if (req.method === 'POST') {
          let body = '';
          const chunks: Buffer[] = [];

          req.on('error', (error) => {
            console.error('Error reading request:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Error reading request' }));
          });

          req.on('data', chunk => chunks.push(chunk));

          req.on('end', async () => {
            try {
              body = Buffer.concat(chunks).toString();
              const data = JSON.parse(body) as {
                image: string;
                name?: string;
                ports?: string[];
                env?: string[];
              };

              const output = await this.dockerService.createContainer(data);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ containerId: output.trim() }));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
          });
        } else {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('Error handling request:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  }

  private async closeConnections(): Promise<void> {
    // Close all keep-alive connections
    for (const res of this.activeConnections) {
      res.end();
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if port is available before starting
      const testServer = http.createServer();
      testServer.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.config.httpPort} is already in use`));
        } else {
          reject(error);
        }
      });

      testServer.once('listening', () => {
        testServer.close(() => {
          this.server.listen(this.config.httpPort, () => {
            console.log(`HTTP server listening on port ${this.config.httpPort}`);
            resolve();
          });
        });
      });

      testServer.listen(this.config.httpPort);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      let forceShutdown: NodeJS.Timeout;

      // First, stop accepting new connections
      this.server.unref();

      // Close existing keep-alive connections
      this.closeConnections();

      // Set a timeout for graceful shutdown
      forceShutdown = setTimeout(() => {
        console.warn('Forcing HTTP server shutdown');
        this.server.closeAllConnections();
        resolve();
      }, SHUTDOWN_TIMEOUT);

      this.server.close((err) => {
        clearTimeout(forceShutdown);
        if (err) {
          console.error('Error closing HTTP server:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}