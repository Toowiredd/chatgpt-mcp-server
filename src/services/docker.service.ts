import { promisify } from 'util';
import { exec } from 'child_process';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

export class DockerService {
  async executeCommand(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker ${command}`);
      return stdout;
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Docker command failed: ${error.message}`
      );
    }
  }

  async listContainers(showAll = false): Promise<string> {
    return this.executeCommand(
      `ps ${showAll ? '-a' : ''} --format "{{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}"`
    );
  }

  async createContainer(params: {
    image: string;
    name?: string;
    ports?: string[];
    env?: string[];
  }): Promise<string> {
    const { image, name, ports, env } = params;
    let cmd = 'run -d';
    if (name) cmd += ` --name ${name}`;
    if (ports) {
      ports.forEach(p => cmd += ` -p ${p}`);
    }
    if (env) {
      env.forEach(e => cmd += ` -e ${e}`);
    }
    cmd += ` ${image}`;
    return this.executeCommand(cmd);
  }

  async stopContainer(id: string): Promise<string> {
    return this.executeCommand(`stop ${id}`);
  }

  async startContainer(id: string): Promise<string> {
    return this.executeCommand(`start ${id}`);
  }

  async removeContainer(id: string, force = false): Promise<string> {
    return this.executeCommand(`rm ${force ? '-f' : ''} ${id}`);
  }

  async getContainerLogs(id: string, tail?: number): Promise<string> {
    return this.executeCommand(`logs ${tail ? `--tail ${tail}` : ''} ${id}`);
  }

  async execInContainer(id: string, command: string): Promise<string> {
    return this.executeCommand(`exec ${id} ${command}`);
  }

  async listDockerContainers(): Promise<{ status: string; containers: string }> {
    const containers = await this.listContainers();
    return { status: 'success', containers };
  }

  async performContainerAction(action: string, containerId: string): Promise<{ status: string; output: string; error: string }> {
    const { stdout, stderr } = await execAsync(`docker ${action} ${containerId}`);
    return {
      status: 'success',
      output: stdout.trim(),
      error: stderr.trim(),
    };
  }
}
