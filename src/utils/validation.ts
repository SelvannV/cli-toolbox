import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export function validatePort(value: string): boolean | string {
  return (
    (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535) ||
    "Enter a valid port (1–65535)."
  );
}

export function validatePositiveInteger(value: string): boolean | string {
  return (
    (/^\d+$/.test(value) && Number(value) >= 1) || "Enter a positive integer."
  );
}

export function validateTimeout(value: string): boolean | string {
  return (
    (/^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0) ||
    "Enter a positive number of seconds."
  );
}

export function validatePath(value: string): boolean | string {
  return (
    /^\/(?:[a-zA-Z0-9._~-]+(?:\/[a-zA-Z0-9._~-]+)*)?(?:\?[^\s#]*)?$/.test(
      value,
    ) || "Enter a valid path (e.g. /, /health, /api/v1)."
  );
}

export function validateEnvFile(value: string): boolean | string {
  if (!value.trim()) return true;

  try {
    const filePath = resolve(value.trim());
    return (
      (existsSync(filePath) && statSync(filePath).isFile()) ||
      "File not found. Enter a valid file path."
    );
  } catch {
    return "Unable to access this file.";
  }
}
