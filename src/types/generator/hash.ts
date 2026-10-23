import { GeneratorOptions } from ".";

export type HashOptions = Omit<GeneratorOptions, "count"> & {
  algorithm: HashAlgorithm;
  text?: string;
  file?: string;
};

export const HASH_ALGORITHM = ["sha1", "sha256", "sha512", "md5"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHM)[number];
