import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class LogService {
  async getSystemLogs(): Promise<string[]> {
    const logs = await this.executeCommand('journalctl -n 100');
    return logs.trim().split('\n');
  }

  async getApplicationLogs(appName: string): Promise<string[]> {
    const logs = await this.executeCommand(`journalctl -u ${appName} -n 100`);
    return logs.trim().split('\n');
  }

  private async executeCommand(command: string): Promise<string> {
    const { stdout } = await execAsync(command);
    return stdout;
  }
}
