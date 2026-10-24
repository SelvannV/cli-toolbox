import type { GeneratorOptions } from ".";

export type PasswordOptions = GeneratorOptions & {
  words: string;
  symbols: boolean;
  substitutions: boolean;
};
