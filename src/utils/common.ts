import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export function runCommand(command: string): string {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: true,
  }).trim();
}

export async function runCommandAsync(command: string): Promise<string> {
  const { stdout } = await execAsync(command, {
    encoding: "utf8",
    windowsHide: true,
  });

  return stdout.trim();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && "stderr" in error) {
    const stderr = (error as Error & { stderr?: Buffer | string }).stderr;
    if (stderr) return String(stderr).trim();
  }

  return error instanceof Error ? error.message : String(error);
}
