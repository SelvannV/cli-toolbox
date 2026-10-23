import { Options } from "boxen";

export type LogLevel = "info" | "success" | "warn" | "error" | "debug";

export interface TitleOptions {
  subtitle?: string;
  tag?: string;
  borderStyle?: Options["borderStyle"];
  borderColor?: Options["borderColor"];
  align?: "left" | "center" | "right";
  paddingX?: number;
}

export interface LoggerOptions {
  showTimestamp?: boolean;
}
