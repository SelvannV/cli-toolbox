export type GeneratorOptions = {
  count: string;
  format: Format;
  noCopy: boolean;
};

export const FORMATS = ["table", "json", "raw"] as const;
export type Format = (typeof FORMATS)[number];
