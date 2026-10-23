import { GeneratorOptions } from ".";

export type SecretOptions = GeneratorOptions & {
  length: string;
  encoding: SecretEncoding;
};

export const SECRET_ENCODING = [
  "base64",
  "hex",
  "base64url",
  "alphanumeric",
] as const;
export type SecretEncoding = (typeof SECRET_ENCODING)[number];
