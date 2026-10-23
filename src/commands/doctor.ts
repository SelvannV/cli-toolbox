import { ChecksResult } from "@/types/doctor";
import { runCommandAsync } from "@/utils/common";
import { withLoader } from "@/utils/loader";
import { logger } from "@/utils/logger";
import chalk from "chalk";
import os from "node:os";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "Unavailable";

  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

function formatSection(
  title: string,
  entries: [string, string][],
  width: number,
): string[] {
  const labelWidth = Math.max(...entries.map(([label]) => label.length));

  const lines = [
    title.toUpperCase(),
    ...entries.map(
      ([label, value]) => `  ${label.padEnd(labelWidth)}  ${value}`,
    ),
    "",
  ];

  return lines.map((line, index) => {
    const formatted = line.slice(0, width).padEnd(width);

    return index === 0 ? chalk.cyan.bold(formatted) : formatted;
  });
}

function showTwoColumnResults(
  sections: {
    title: string;
    entries: [string, string][];
  }[],
): void {
  const columnWidth = 38;
  const gap = "   ";
  const rows: string[][] = [];

  for (let i = 0; i < sections.length; i += 2) {
    const left = formatSection(
      sections[i].title,
      sections[i].entries,
      columnWidth,
    );

    const rightSection = sections[i + 1];
    const right = rightSection
      ? formatSection(rightSection.title, rightSection.entries, columnWidth)
      : [];

    const height = Math.max(left.length, right.length);

    for (let line = 0; line < height; line++) {
      rows.push([left[line] ?? " ".repeat(columnWidth), right[line] ?? ""]);
    }

    console.log(
      rows
        .splice(0)
        .map(([leftLine, rightLine]) => `${leftLine}${gap}${rightLine}`)
        .join("\n"),
    );
  }
}

function available(value: string): string {
  return value === "Unavailable" ? "Not found" : value;
}

function showResults(result: ChecksResult): void {
  const { system, resources, runtimes, development, docker, tools } = result;

  const dockerAvailable = docker.serverVersion !== "Unavailable";

  showTwoColumnResults([
    {
      title: "SYSTEM",
      entries: [
        ["Platform", `${system.platform} (${system.architecture})`],
        ["Shell", system.shell],
      ],
    },
    {
      title: "RESOURCES",
      entries: [
        ["CPU cores", String(resources.cpuCores)],
        ["Total memory", formatBytes(resources.totalMemoryBytes)],
        ["Available memory", formatBytes(resources.freeMemoryBytes)],
      ],
    },
    {
      title: "RUNTIMES",
      entries: [
        ["Node.js", available(runtimes.node)],
        ["pnpm", available(runtimes.pnpm)],
        ["Python", available(runtimes.python)],
        ["Java", available(runtimes.java)],
      ],
    },
    {
      title: "DEVELOPMENT",
      entries: [
        ["Git", available(development.git)],
        ["Git branch", development.gitBranch],
        [
          "Working tree",
          development.gitWorkingTreeClean ? "Clean" : "Dirty / unavailable",
        ],
        ["TypeScript", available(development.typescript)],
      ],
    },
    {
      title: "DOCKER",
      entries: [
        ["Daemon", dockerAvailable ? "Running" : "Unavailable"],
        ["Client", available(docker.clientVersion)],
        ["Engine", available(docker.serverVersion)],
        ["Context", available(docker.context)],
        ["Running containers", String(docker.runningContainers)],
        ["Images", String(docker.images)],
      ],
    },
    {
      title: "TOOLS",
      entries: [
        ["Docker Compose", available(tools.dockerCompose)],
        ["Docker Buildx", available(tools.dockerBuildx)],
        ["curl", available(tools.curl)],
      ],
    },
  ]);

  const missingTools = [runtimes.node, runtimes.pnpm, development.git].filter(
    (value) => value === "Unavailable",
  ).length;

  const issues = missingTools + Number(!dockerAvailable);

  if (issues > 0) {
    logger.warn(`System checks completed with ${issues} issue(s).`);
  } else {
    logger.success("System checks completed.");
  }
}

async function safeRun(
  command: string,
  fallback = "Unavailable",
): Promise<string> {
  try {
    const output = (await runCommandAsync(command)).trim();
    return output || fallback;
  } catch {
    return fallback;
  }
}

function firstLine(value: string): string {
  return value.split(/\r?\n/, 1)[0].trim();
}

function versionOnly(value: string): string {
  if (value === "Unavailable") return value;

  const match = value.match(
    /(?:version\s+)?v?(\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?)/i,
  );
  return match ? match[1] : firstLine(value);
}

async function safeDockerInfo(): Promise<Record<string, unknown> | null> {
  try {
    const output = await runCommandAsync('docker info --format "{{json .}}"');
    return JSON.parse(output) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getDockerString(
  info: Record<string, unknown> | null,
  key: string,
): string {
  const value = info?.[key];
  return typeof value === "string" && value ? value : "Unavailable";
}

function getDockerNumber(
  info: Record<string, unknown> | null,
  key: string,
): number {
  const value = info?.[key];
  return typeof value === "number" ? value : 0;
}

export async function checkSystem(): Promise<ChecksResult> {
  const [
    gitStatus,
    gitBranch,
    gitVersion,
    nodeVersion,
    pnpmVersion,
    pythonVersion,
    javaVersion,
    typescriptVersion,
    dockerClientVersion,
    dockerContext,
    dockerInfo,
    curlVersion,
    dockerComposeVersion,
    dockerBuildxVersion,
  ] = await Promise.all([
    safeRun("git status --porcelain", "unavailable"),
    safeRun("git branch --show-current", "unavailable"),
    safeRun("git --version"),
    Promise.resolve(process.version),
    safeRun("pnpm --version"),
    (async () => {
      const python = await safeRun("python --version");
      return python !== "Unavailable"
        ? firstLine(python).replace(/^Python\s+/i, "")
        : firstLine(await safeRun("python3 --version"));
    })(),
    safeRun("java -version 2>&1"),
    safeRun("pnpm exec tsc --version"),
    safeRun('docker version --format "{{.Client.Version}}"'),
    safeRun("docker context show"),
    safeDockerInfo(),
    safeRun("curl --version"),
    safeRun("docker compose version --short"),
    safeRun("docker buildx version"),
  ]);

  const gitWorkingTreeClean = gitStatus !== "unavailable" && gitStatus === "";

  return {
    system: {
      platform: os.platform(),
      architecture: os.arch(),
      shell: process.env.SHELL ?? process.env.ComSpec ?? "Unknown",
    },

    resources: {
      cpuCores: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
    },

    runtimes: {
      node: versionOnly(nodeVersion),
      pnpm: versionOnly(pnpmVersion),
      python: versionOnly(pythonVersion),
      java: versionOnly(javaVersion),
    },

    development: {
      git: versionOnly(gitVersion),
      gitBranch,
      gitWorkingTreeClean,
      typescript: versionOnly(typescriptVersion),
    },

    tools: {
      curl: versionOnly(curlVersion),
      dockerCompose: versionOnly(dockerComposeVersion),
      dockerBuildx: versionOnly(dockerBuildxVersion),
    },

    docker: {
      clientVersion: dockerClientVersion,
      serverVersion: getDockerString(dockerInfo, "ServerVersion"),
      context: dockerContext,
      runningContainers: getDockerNumber(dockerInfo, "ContainersRunning"),
      images: getDockerNumber(dockerInfo, "Images"),
    },
  };
}

export async function doctorCommand(): Promise<void> {
  logger.title("System Doctor", { paddingX: 20 });

  try {
    const result = await withLoader(
      "Inspecting your system...",
      async () => checkSystem(),
      true,
    );

    showResults(result);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
