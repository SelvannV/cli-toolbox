import { FORMATS } from "@/types/generator";
import { HASH_ALGORITHM, HashOptions } from "@/types/generator/hash";
import { displayGeneratorOutput } from "@/utils/generator-output";
import { parseOption, validators } from "@/utils/validation";
import { Command } from "commander";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export async function hashCommand(
  options: HashOptions,
  command: Command,
): Promise<void> {
  const algorithm = parseOption(
    command,
    options.algorithm,
    validators.oneOf(HASH_ALGORITHM),
  );

  const format = parseOption(
    command,
    options.format,
    validators.oneOf(FORMATS),
  );

  const hasText = options.text !== undefined;
  const hasFile = options.file !== undefined;

  if (hasText === hasFile) {
    command.error("Provide exactly one of --text or --file.");
  }

  const copy = options.copy;
  const hash = createHash(algorithm);

  if (hasText) {
    hash.update(options.text!, "utf8");
  } else {
    const file = options.file!.trim();

    if (!file) {
      command.error("File path cannot be empty.");
    }

    try {
      for await (const chunk of createReadStream(file)) {
        hash.update(chunk);
      }
    } catch (error) {
      command.error(
        `Unable to read file "${file}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const digest = hash.digest("hex");

  displayGeneratorOutput({
    title: "Hash generator",
    format,
    values: [digest],
    details: {
      Algorithm: algorithm,
      Source: hasText ? "Text" : options.file!,
    },
    copy,
  });
}
