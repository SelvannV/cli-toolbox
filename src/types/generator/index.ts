export type GeneratorOptions = {
  count: string;
  format: Format;
  copy: boolean;
};

export const FORMATS = ["table", "json", "raw"] as const;
export type Format = (typeof FORMATS)[number];
