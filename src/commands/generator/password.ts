import { WORDS } from "@/data/words";
import { FORMATS } from "@/types/generator";
import type { PasswordOptions } from "@/types/generator/password";
import { displayGeneratorOutput } from "@/utils/generator-output";
import { parseOption, validators } from "@/utils/validation";
import { Command } from "commander";
import { randomInt } from "node:crypto";

const SEPARATORS = ["-", "_", "."] as const;
const SYMBOLS = ["!", "@", "#", "$", "%", "+", "?"] as const;

const SUBSTITUTIONS: Record<string, string[]> = {
  a: ["@"],
  e: ["3"],
  i: ["1", "!"],
  o: ["0"],
  s: ["$"],
  t: ["7"],
};

function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

function chance(percent: number): boolean {
  return randomInt(100) < percent;
}

function transformWord(word: string, substitutions: boolean): string {
  return [...word]
    .map((character, index) => {
      let result = character;

      // Change capitalization occasionally, not on every character.
      if (chance(15)) {
        result = chance(50) ? result.toUpperCase() : result.toLowerCase();
      } else if (index === 0 && chance(40)) {
        result = result.toUpperCase();
      }

      // Substitute only a few eligible letters to preserve readability.
      if (substitutions && chance(15)) {
        const replacements = SUBSTITUTIONS[result.toLowerCase()];

        if (replacements) {
          result = pick(replacements);
        }
      }

      return result;
    })
    .join("");
}

function generatePassword(
  wordCount: number,
  symbols: boolean,
  substitutions: boolean,
): string {
  const selectedWords = Array.from({ length: wordCount }, () => pick(WORDS));

  const words = selectedWords.map((word) => transformWord(word, substitutions));

  // Always separate words clearly when symbols are enabled.
  const separator = symbols ? pick(SEPARATORS) : "";
  let password = words.join(separator);

  // Optional leading or trailing symbols.
  if (symbols && chance(35)) {
    password = pick(SYMBOLS) + password;
  }

  if (symbols && chance(35)) {
    password += pick(SYMBOLS);
  }

  return password;
}

export async function passwordCommand(
  options: PasswordOptions,
  command: Command,
): Promise<void> {
  const count = parseOption(command, options.count, validators.positiveInteger);

  const words = parseOption(command, options.words, validators.positiveInteger);

  const format = parseOption(
    command,
    options.format,
    validators.oneOf(FORMATS),
  );

  if (words > 10) {
    command.error("The number of words must not exceed 10.");
  }

  const generated = Array.from({ length: count }, () =>
    generatePassword(words, options.symbols, options.substitutions),
  );

  displayGeneratorOutput({
    title: "Password generator",
    format,
    values: generated,
    details: {
      Count: count,
      Words: words,
      Symbols: options.symbols ? "Enabled" : "Disabled",
      Substitutions: options.substitutions ? "Enabled" : "Disabled",
    },
    copy: options.copy,
  });
}
