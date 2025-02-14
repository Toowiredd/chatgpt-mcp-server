import * as http from 'http';
import { DockerService } from '../services/docker.service.js';
import { ConfigService } from '../services/config.service.js';

export class HttpServer {
  private server: http.Server;
  private dockerService: DockerService;
  private config: ConfigService;
  private requestCount: number = 0;
  private lastRequestTime: number = Date.now();

  constructor(dockerService: DockerService) {
    this.dockerService = dockerService;
    this.config = ConfigService.getInstance();
    this.server = http.createServer(this.handleRequest.bind(this));
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
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Check API key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== this.config.apiKey) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Invalid API key' }));
      return;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      res.writeHead(429);
      res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
      return;
    }

    try {
      if (req.url?.startsWith('/containers')) {
        if (req.method === 'GET') {
          const output = await this.dockerService.listContainers();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ containers: output.trim().split('\n') }));
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
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
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
          });
        } else {
          res.writeHead(405);
          res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('Error handling request:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.httpPort, () => {
        console.log(`HTTP server listening on port ${this.config.httpPort}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}