import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SystemService {
  async getStatus(): Promise<{ uptime: string; memory: string; disk: string; load: string }> {
    const uptime = await this.executeCommand('uptime -p');
    const memory = await this.executeCommand('free -h');
    const disk = await this.executeCommand('df -h');
    const load = await this.executeCommand('uptime');

    return {
      uptime: uptime.trim(),
      memory: memory.trim(),
      disk: disk.trim(),
      load: load.trim(),
    };
  }

  async manageService({ name, action }: { name: string; action: string }): Promise<{ status: string; output: string; error: string }> {
    const { stdout, stderr } = await execAsync(`systemctl ${action} ${name}`);
    return {
      status: 'success',
      output: stdout.trim(),
      error: stderr.trim(),
    };
  }

  private async executeCommand(command: string): Promise<string> {
    const { stdout } = await execAsync(command);
    return stdout;
  }
}
