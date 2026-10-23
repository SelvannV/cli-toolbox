import { FORMATS } from "@/types/generator";
import { SECRET_ENCODING, SecretOptions } from "@/types/generator/secret";
import { displayGeneratorOutput } from "@/utils/generator-output";
import { parseOption, validators } from "@/utils/validation";
import { Command } from "commander";
import { randomBytes } from "node:crypto";

export async function secretCommand(
  options: SecretOptions,
  command: Command,
): Promise<void> {
  const count = parseOption(command, options.count, validators.positiveInteger);
  const length = parseOption(
    command,
    options.length,
    validators.positiveInteger,
  );
  const format = parseOption(
    command,
    options.format,
    validators.oneOf(FORMATS),
  );
  const encoding = parseOption(
    command,
    options.encoding,
    validators.oneOf(SECRET_ENCODING),
  );

  const copy = options.copy;

  const generateSecret = (): string => {
    switch (encoding) {
      case "hex":
        return randomBytes(Math.ceil(length / 2))
          .toString("hex")
          .slice(0, length);

      case "base64":
        return randomBytes(Math.ceil((length * 3) / 4) + 2)
          .toString("base64")
          .replace(/=+$/, "")
          .slice(0, length);

      case "base64url":
        return randomBytes(Math.ceil((length * 3) / 4) + 2)
          .toString("base64url")
          .slice(0, length);

      case "alphanumeric": {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        // Rejection sampling avoids modulo bias.
        const max = 256 - (256 % chars.length);

        while (result.length < length) {
          for (const byte of randomBytes(length - result.length + 16)) {
            if (byte < max) {
              result += chars[byte % chars.length];
              if (result.length === length) break;
            }
          }
        }

        return result;
      }
    }
  };

  const generated = Array.from({ length: count }, generateSecret);

  displayGeneratorOutput({
    title: "Secret generator",
    format,
    values: generated,
    details: {
      Count: count,
      Length: length,
      Encoding: encoding,
    },
    copy,
  });
}
