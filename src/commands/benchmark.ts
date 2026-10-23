import { BenchmarkOptions } from "@/types/benchmark";
import { errorMessage, sleep } from "@/utils/common";
import {
  docker,
  getExposedPorts,
  getImagesExposingTcpPorts,
} from "@/utils/docker";
import { logger } from "@/utils/logger";
import {
  validateEnvFile,
  validatePath,
  validatePort,
  validatePositiveInteger,
  validateTimeout,
} from "@/utils/validation";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

async function waitUntilReady(
  url: string,
  timeoutSeconds: number,
): Promise<void> {
  const deadline = performance.now() + timeoutSeconds * 1000;

  while (performance.now() < deadline) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "CliToolboxBenchmark/1.0" },
        signal: AbortSignal.timeout(1000),
      });

      const ready = response.status >= 200 && response.status < 400;
      await response.body?.cancel();

      if (ready) return;
    } catch {
      // The application may still be starting.
    }

    await sleep(50);
  }

  throw new Error(
    `Endpoint did not become ready within ${timeoutSeconds}s: ${url}`,
  );
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

export async function benchmarkCommand(
  options: BenchmarkOptions,
  _command: Command,
): Promise<void> {
  logger.title("Image Benchmark", {
    subtitle: "Container startup and HTTP readiness performance",
  });

  // Select or manually specify an image.
  const images = getImagesExposingTcpPorts();

  const image =
    options.image ??
    (images.length > 0
      ? await select({
          message: "Select an image to benchmark",
          choices: images.map((value) => ({ name: value, value })),
        })
      : await input({
          message: "Docker image to benchmark",
          validate: (value) =>
            value.trim().length > 0 || "Enter an image name.",
        }));

  // A manually supplied port works even when the image has no EXPOSE metadata.
  const exposedPorts = getExposedPorts(image).filter((port) =>
    /^\d+\/tcp$/.test(port),
  );

  const portInput =
    options.port ??
    (exposedPorts.length > 0
      ? await select({
          message: "Select the container port",
          choices: exposedPorts.map((value) => ({
            name: value,
            value: value.split("/")[0],
          })),
        })
      : await input({
          message: "Container port (image has no EXPOSE metadata)",
          validate: validatePort,
        }));

  const portNumber = Number(portInput.split("/")[0]);
  const portValidation = validatePort(String(portNumber));

  if (portValidation !== true) {
    throw new Error(String(portValidation));
  }

  const hostPortInput =
    options.hostPort ??
    (await input({
      message: "Host port (leave empty for a random port)",
      default: "",
      validate: (value) => (value.trim() ? validatePort(value) : true),
    }));

  const machinePort = hostPortInput.trim() ? Number(hostPortInput) : undefined;

  const path =
    options.path ??
    (await input({
      message: "HTTP path to test",
      default: "/",
      validate: validatePath,
    }));

  if (validatePath(path) !== true) {
    throw new Error(String(validatePath(path)));
  }

  const envInput =
    options.envFile ??
    (await input({
      message: "Path to .env file (optional)",
      default: "",
      validate: validateEnvFile,
    }));

  const envFile = envInput.trim() ? resolve(envInput.trim()) : undefined;

  if (validateEnvFile(envInput) !== true) {
    throw new Error(String(validateEnvFile(envInput)));
  }

  const network = options.network?.trim() || undefined;

  const runsInput =
    options.runs ??
    (await input({
      message: "Number of trials",
      default: "20",
      validate: validatePositiveInteger,
    }));

  const timeoutInput =
    options.timeout ??
    (await input({
      message: "Timeout per trial (seconds)",
      default: "30",
      validate: validateTimeout,
    }));

  if (validatePositiveInteger(runsInput) !== true) {
    throw new Error(String(validatePositiveInteger(runsInput)));
  }

  if (validateTimeout(timeoutInput) !== true) {
    throw new Error(String(validateTimeout(timeoutInput)));
  }

  const runs = Number(runsInput);
  const timeout = Number(timeoutInput);
  const results: number[] = [];
  let failures = 0;

  logger.blank();
  logger.title("Configuration");

  console.log(`  ${chalk.gray("Image")}          ${chalk.bold.cyan(image)}`);
  console.log(
    `  ${chalk.gray("Container port")} ${chalk.bold(String(portNumber))}`,
  );
  console.log(
    `  ${chalk.gray("Host port")}      ${
      machinePort ? chalk.bold(String(machinePort)) : chalk.green("Random")
    }`,
  );
  console.log(`  ${chalk.gray("HTTP path")}     ${chalk.underline(path)}`);
  console.log(
    `  ${chalk.gray("Environment")}    ${
      envFile ? chalk.green("Custom .env file") : chalk.gray("None")
    }`,
  );
  console.log(
    `  ${chalk.gray("Network")}        ${network ?? chalk.gray("Default")}`,
  );
  console.log(`  ${chalk.gray("Trials")}         ${chalk.bold(String(runs))}`);
  console.log(`  ${chalk.gray("Timeout")}        ${chalk.bold(`${timeout}s`)}`);

  logger.blank();
  logger.divider();
  console.log(chalk.bold("  Running benchmark"));
  logger.divider();

  for (let trial = 1; trial <= runs; trial++) {
    let containerId: string | undefined;
    const start = performance.now();
    const trialLabel = `[${String(trial).padStart(2, "0")}/${runs}]`;

    try {
      const args = ["run", "-d", "--rm", "--pull=never"];

      if (network) {
        args.push("--network", network);
      }

      args.push(
        "-p",
        machinePort
          ? `127.0.0.1:${machinePort}:${portNumber}`
          : `127.0.0.1::${portNumber}`,
      );

      if (envFile) {
        args.push("--env-file", envFile);
      }

      args.push(image);

      containerId = docker(...args);

      // Find the randomly assigned host port when one was requested.
      const mapping = docker("port", containerId, `${portNumber}/tcp`);

      const match = mapping.match(/127\.0\.0\.1:(\d+)/);

      if (!match) {
        throw new Error(`Could not determine published port: ${mapping}`);
      }

      const actualHostPort = Number(match[1]);
      const url = `http://127.0.0.1:${actualHostPort}${path}`;

      await waitUntilReady(url, timeout);

      const elapsed = (performance.now() - start) / 1000;
      results.push(elapsed);

      console.log(
        `  ${chalk.gray(trialLabel)} ${chalk.green("✔ READY")}  ` +
          chalk.bold(`${elapsed.toFixed(3)}s`),
      );
    } catch (error) {
      failures++;

      console.log(
        `  ${chalk.gray(trialLabel)} ${chalk.red("✖ FAILED")} ` +
          chalk.gray(errorMessage(error).split("\n")[0]),
      );
    } finally {
      if (containerId) {
        try {
          docker("stop", containerId);
        } catch {
          // The container may already have exited.
        }
      }
    }
  }

  logger.blank();
  logger.title("Benchmark Results");

  console.log(`  ${chalk.gray("Image")}      ${chalk.bold.cyan(image)}`);
  console.log(
    `  ${chalk.gray("Successful")} ${chalk.green.bold(`${results.length}/${runs}`)}`,
  );
  console.log(
    `  ${chalk.gray("Failed")}     ${
      failures ? chalk.red.bold(String(failures)) : chalk.green("0")
    }`,
  );

  if (results.length > 0) {
    const sorted = [...results].sort((a, b) => a - b);
    const average =
      results.reduce((sum, value) => sum + value, 0) / results.length;
    const middle = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];

    logger.blank();
    logger.divider();

    console.log(
      `  ${chalk.gray("Average")} ${chalk.bold.white(`${average.toFixed(3)}s`)}`,
    );
    console.log(
      `  ${chalk.gray("Median")}  ${chalk.bold.cyan(`${median.toFixed(3)}s`)}`,
    );
    console.log(
      `  ${chalk.gray("P90")}     ${chalk.bold(`${percentile(sorted, 90).toFixed(3)}s`)}`,
    );
    console.log(
      `  ${chalk.gray("Fastest")} ${chalk.green.bold(`${sorted[0].toFixed(3)}s`)}`,
    );
    console.log(
      `  ${chalk.gray("Slowest")} ${chalk.yellow.bold(`${sorted[sorted.length - 1].toFixed(3)}s`)}`,
    );

    logger.divider();
  }

  if (failures > 0) {
    logger.warn(
      "Some trials failed. Check the image, network, environment and endpoint.",
    );
    process.exitCode = 1;
  } else {
    logger.blank();
    logger.success("All trials completed successfully.");
  }
}
