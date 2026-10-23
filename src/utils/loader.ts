import ora, { type Ora } from "ora";

export function createLoader(text: string): Ora {
  return ora({ text, spinner: "dots", color: "cyan" });
}

export function withLoader<T>(
  text: string,
  task: () => Promise<T>,
  successMessage: (elapsedTime: string) => string,
): Promise<T>;

export function withLoader<T>(
  text: string,
  task: () => Promise<T>,
  silent: true,
): Promise<T>;

export async function withLoader<T>(
  text: string,
  task: () => Promise<T>,
  option: ((elapsedTime: string) => string) | true,
): Promise<T> {
  const startTime = performance.now();
  const spinner = createLoader(text).start();

  try {
    const result = await task();

    if (typeof option === "function") {
      const elapsedTime = `${((performance.now() - startTime) / 1000).toFixed(
        2,
      )}s`;

      spinner.succeed(option(elapsedTime));
    } else {
      spinner.stop();
    }

    return result;
  } catch (error) {
    spinner.fail("Operation failed");
    throw error;
  }
}
