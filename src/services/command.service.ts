import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CommandService {
  async executeCommand(command: string): Promise<{ status: string; output: string; error: string; code: number }> {
    try {
      const { stdout, stderr } = await execAsync(command);
      return {
        status: 'success',
        output: stdout.trim(),
        error: stderr.trim(),
        code: 0
      };
    } catch (error: any) {
      return {
        status: 'error',
        output: '',
        error: error.message,
        code: error.code || 1
      };
    }
  }
}
