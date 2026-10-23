import { ValidationResult, Validator } from "@/types/validation";
import type { Command } from "commander";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Adapts a validator for @inquirer/prompts.
 */
export function validatePrompt<T>(
  validator: Validator<T>,
): (value: string) => true | string {
  return (value) => {
    const result = validator(value);
    return result.valid ? true : result.error;
  };
}

/**
 * Validates and parses a Commander option.
 */
export function parseOption<T>(
  command: Command,
  value: string,
  validator: Validator<T>,
): T {
  const result = validator(value);

  if (!result.valid) {
    command.error(result.error);
  }

  return result.value;
}

/**
 * Reusable validators.
 */
export const validators = {
  positiveInteger: (value: string): ValidationResult<number> => {
    const parsed = Number(value);

    if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
      return {
        valid: false,
        error: "Must be a positive integer.",
      };
    }

    return { valid: true, value: parsed };
  },

  port: (value: string): ValidationResult<number> => {
    const parsed = Number(value);

    if (
      !/^\d+$/.test(value) ||
      !Number.isInteger(parsed) ||
      parsed < 1 ||
      parsed > 65535
    ) {
      return {
        valid: false,
        error: "Enter a valid port (1–65535).",
      };
    }

    return { valid: true, value: parsed };
  },

  timeout: (value: string): ValidationResult<number> => {
    const parsed = Number(value);

    if (
      !/^\d+(?:\.\d+)?$/.test(value) ||
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      return {
        valid: false,
        error: "Enter a positive number of seconds.",
      };
    }

    return { valid: true, value: parsed };
  },

  path: (value: string): ValidationResult<string> =>
    /^\/[^\s#]*$/.test(value)
      ? { valid: true, value }
      : {
          valid: false,
          error: "Enter a valid HTTP path (e.g. /, /health, /api/v1).",
        },

  envFile: (value: string): ValidationResult<string | undefined> => {
    const trimmed = value.trim();

    if (!trimmed) {
      return { valid: true, value: undefined };
    }

    try {
      const filePath = resolve(trimmed);

      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        return {
          valid: false,
          error: "File not found. Enter a valid file path.",
        };
      }

      return { valid: true, value: filePath };
    } catch {
      return {
        valid: false,
        error: "Unable to access this file.",
      };
    }
  },

  dockerImage: (value: string): ValidationResult<string> => {
    const image = value.trim();

    if (
      !image ||
      /\s/.test(image) ||
      image.startsWith("-") ||
      image.endsWith("/") ||
      image.includes("://")
    ) {
      return {
        valid: false,
        error: "Enter a valid Docker image name (e.g. nginx:latest).",
      };
    }

    return { valid: true, value: image };
  },

  network: (value: string): ValidationResult<string | undefined> => {
    const network = value.trim();

    if (!network) {
      return { valid: true, value: undefined };
    }

    if (
      /\s/.test(network) ||
      network.startsWith("-") ||
      network.includes("://")
    ) {
      return {
        valid: false,
        error: "Enter a valid Docker network name.",
      };
    }

    return { valid: true, value: network };
  },

  nonEmpty: (value: string): ValidationResult<string> =>
    value.trim().length > 0
      ? { valid: true, value: value.trim() }
      : { valid: false, error: "Value cannot be empty." },

  regex: (pattern: RegExp, error: string): Validator<string> => {
    return (value) =>
      pattern.test(value) ? { valid: true, value } : { valid: false, error };
  },

  oneOf: <T extends string>(choices: readonly T[]): Validator<T> => {
    return (value) =>
      choices.includes(value as T)
        ? { valid: true, value: value as T }
        : {
            valid: false,
            error: `Must be one of: ${choices.join(", ")}.`,
          };
  },
};
