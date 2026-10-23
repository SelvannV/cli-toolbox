import { runCommand } from "@/utils/common";
import { execFileSync } from "node:child_process";

export function docker(...args: string[]): string {
  return runCommand(`docker ${args.join(" ")}`);
}

export function getImagesExposingTcpPorts(): string[] {
  const output = execFileSync("docker", ["image", "ls", "-q", "--no-trunc"], {
    encoding: "utf8",
  });

  const ids = [...new Set(output.trim().split("\n").filter(Boolean))];

  if (ids.length === 0) return [];

  const inspected = execFileSync(
    "docker",
    [
      "image",
      "inspect",
      ...ids,
      "--format",
      "{{if .Config.ExposedPorts}}{{.RepoTags}} {{json .Config.ExposedPorts}}{{end}}",
    ],
    { encoding: "utf8" },
  );

  return inspected
    .split("\n")
    .filter((line) => /\/tcp/.test(line))
    .flatMap((line) => {
      const tags = line.match(/\[[^\]]*\]/)?.[0];
      return tags ? tags.slice(1, -1).split(" ").filter(Boolean) : [];
    });
}

export function getExposedPorts(image: string): string[] {
  const output = execFileSync(
    "docker",
    ["image", "inspect", image, "--format", "{{json .Config.ExposedPorts}}"],
    { encoding: "utf8" },
  );

  const ports = JSON.parse(output) as Record<string, unknown> | null;

  return Object.keys(ports ?? {});
}
