import { FORMATS } from "@/types/generator";
import { logger } from "@/utils/logger";
import clipboard from "clipboardy";

type GeneratorOutputOptions = {
  title: string;
  format: (typeof FORMATS)[number];
  values: string[];
  details: Record<string, unknown>;
  copy: boolean;
};

export function displayGeneratorOutput({
  title,
  format,
  values,
  details,
  copy,
}: GeneratorOutputOptions): void {
  const rawOutput = values.join("\n");

  let output: string;

  switch (format) {
    case "table": {
      output = rawOutput;

      logger.title(title, { paddingX: 20 });
      logger.subtitle("Generator Options");
      logger.keyValue(details);
      logger.divider({ length: 41 });

      const valueMap = Object.fromEntries(
        values.map((value, index) => [
          `#${String(index + 1).padStart(2, "0")}`,
          value,
        ]),
      );

      logger.keyValue(valueMap, { leftPadding: 0 });
      logger.divider({ length: 41 });
      break;
    }

    case "json":
      output = JSON.stringify(values, null, 2);
      console.log(output);
      break;

    case "raw":
      output = rawOutput;
      console.log(output);
      break;
  }

  if (copy) {
    clipboard.writeSync(output);
    logger.hint("\nResults have been copied to clipboard");
  }
}
