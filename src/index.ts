#!/usr/bin/env node
import { benchmarkCommand } from "@/commands/benchmark";
import { doctorCommand } from "@/commands/doctor";
import { logger } from "@/utils/logger";
import { ExitPromptError } from "@inquirer/core";
import { Command } from "commander";

const program = new Command();

program.name("tb").description("Personal terminal toolbox").version("1.0.0");

program
  .command("benchmark")
  .description("Benchmark Docker image startup performance")
  .option("-i, --image <image>", "Docker image to benchmark")
  .option("-p, --port <port>", "Container port, e.g. 3000")
  .option("--host-port <port>", "Host port (default: 3333)")
  .option("--path <path>", "HTTP readiness path (default: /)")
  .option("--env-file <path>", "Environment file passed to the container")
  .option("-r, --runs <count>", "Number of trials")
  .option("-t, --timeout <seconds>", "Timeout per trial")
  .option("-n, --network <network>", "Docker network to connect to")
  .action(benchmarkCommand);

program
  .command("doctor")
  .description("Checkup system metrics")
  .action(doctorCommand);

program.parseAsync().catch((error: unknown) => {
  if (error instanceof ExitPromptError) {
    logger.error("Cancelled.");
    process.exitCode = 130;
    return;
  }

  logger.error("An unexpected error occurred:", error);
  process.exitCode = 1;
});
