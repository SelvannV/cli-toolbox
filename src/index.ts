#!/usr/bin/env node
import { benchmarkCommand } from "@/commands/benchmark";
import { doctorCommand } from "@/commands/doctor";
import { hashCommand } from "@/commands/generator/hash";
import { secretCommand } from "@/commands/generator/secret";
import { uuidCommand } from "@/commands/generator/uuid";
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

const genCommand = program
  .command("generator")
  .alias("gen")
  .description("Different data generators");

genCommand
  .command("uuid")
  .description("Generates UUIDs")
  .option("-c, --count <count>", "Number of UUIDs to generate", "5")
  .option("-v, --version <version>", "UUID version", "v4")
  .option(
    "-f, --format <format>",
    "Output format: table, json, or raw",
    "table",
  )
  .option("--no-copy", "Disable auto copy output to clipboard")
  .action(uuidCommand);

genCommand
  .command("secret")
  .description("Generates cryptographically secure secrets")
  .option("-l, --length <length>", "Secret length", "64")
  .option("-c, --count <count>", "Number of secrets to generate", "3")
  .option(
    "-e, --encoding <encoding>",
    "Secret encoding: base64, hex, base64url, or alphanumeric",
    "base64",
  )
  .option(
    "-f, --format <format>",
    "Output format: table, json, or raw",
    "table",
  )
  .option("--no-copy", "Disable auto copy output to clipboard")
  .action(secretCommand);

genCommand
  .command("hash")
  .description("Generates a hash from text or a file")
  .option("-t, --text <text>", "Text to hash")
  .option("-i, --file <path>", "File to hash")
  .option(
    "-a, --algorithm <algorithm>",
    "Hash algorithm: sha1, sha256, sha512, or md5",
    "sha256",
  )
  .option(
    "-f, --format <format>",
    "Output format: table, json, or raw",
    "table",
  )
  .option("--no-copy", "Disable auto copy output to clipboard")
  .action(hashCommand);

program.parseAsync().catch((error: unknown) => {
  if (error instanceof ExitPromptError) {
    logger.error("Cancelled.");
    process.exitCode = 130;
    return;
  }

  logger.error("An unexpected error occurred:", error);
  process.exitCode = 1;
});
