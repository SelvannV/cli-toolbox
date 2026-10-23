import { UUID_FORMATS, UuidOptions } from "@/types/uuid";
import { logger } from "@/utils/logger";
import { parseOption, validators } from "@/utils/validation";
import clipboard from "clipboardy";
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
    validators.oneOf(UUID_FORMATS),
  );

  const copy = !options.noCopy;

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

  switch (format) {
    case "table":
      if (copy) {
        clipboard.writeSync(generated.join("\n"));
      }
      logger.title("UUID generator", { paddingX: 10 });
      logger.subtitle("Generator Options");
      logger.keyValue({
        Count: count,
        Version: version,
      });
      logger.divider({ length: 41 });
      const uuidMap = Object.fromEntries(
        generated.map((id, index) => [
          `#${String(index + 1).padStart(2, "0")}`,
          id,
        ]),
      );
      logger.keyValue(uuidMap, { leftPadding: 0 });
      logger.divider({ length: 41 });
      break;
    case "json":
      if (copy) {
        clipboard.writeSync(JSON.stringify(generated, null, 2));
      }
      console.log(JSON.stringify(generated, null, 2));
      break;
    case "raw":
      if (copy) {
        clipboard.writeSync(generated.join("\n"));
      }
      generated.forEach((id) => console.log(id));
      break;
  }

  if (copy) {
    logger.hint("\nResults have been copied to clipboard");
  }
}
