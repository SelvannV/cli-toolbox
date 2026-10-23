export type UuidOptions = {
  count: string;
  version: string;
  format: string;
  noCopy: boolean;
};

export const UUID_FORMATS = ["table", "json", "raw"] as const;
export type UuidFormat = (typeof UUID_FORMATS)[number];
