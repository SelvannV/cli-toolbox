import { FORMATS } from "@/types/generator";
import { UuidOptions } from "@/types/generator/uuid";
import { displayGeneratorOutput } from "@/utils/generator-output";
import { parseOption, validators } from "@/utils/validation";
import { Command } from "commander";
import * as uuid from "uuid";

export async function uuidCommand(
  options: UuidOptions,
  command: Command,
): Promise<void> {
  const validateVersion = validators.regex(
    /^v[1467]$/,
    "Version must be between v1 and v7.",
  );

  const count = parseOption(command, options.count, validators.positiveInteger);
  const version = parseOption(command, options.version, validateVersion);
  const format = parseOption(
    command,
    options.format,
    validators.oneOf(FORMATS),
  );

  const copy = options.copy;

  const generated = Array.from({ length: count }, () => {
    switch (version) {
      case "v1":
        return uuid.v1();
      case "v4":
        return uuid.v4();
      case "v6":
        return uuid.v6();
      case "v7":
        return uuid.v7();
      default:
        return uuid.NIL;
    }
  });

  displayGeneratorOutput({
    title: "UUID generator",
    format,
    values: generated,
    details: {
      Count: count,
      Version: version,
    },
    copy,
  });
}
