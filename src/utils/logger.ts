import { LoggerOptions, LogLevel, TitleOptions } from "@/types/logger";
import boxen from "boxen";
import chalk from "chalk";

let globalOptions: LoggerOptions = { showTimestamp: false };

// Clean, minimal CLI symbols instead of bulky background badges
const symbols: Record<LogLevel, string> = {
  info: chalk.blue(" "),
  success: chalk.green("✔"),
  warn: chalk.yellow("⚠"),
  error: chalk.red("✖"),
  debug: chalk.magenta("◆"),
};

const messageColors: Record<LogLevel, (text: string) => string> = {
  info: chalk.white,
  success: chalk.white,
  warn: chalk.yellow,
  error: chalk.red,
  debug: chalk.gray,
};

function formatArgs(args: unknown[]): string[] {
  return args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      return "\n" + chalk.gray(JSON.stringify(arg, null, 2));
    }
    return String(arg);
  });
}

function log(level: LogLevel, message: string, ...args: unknown[]) {
  const timestamp = globalOptions.showTimestamp
    ? chalk.gray(`[${new Date().toLocaleTimeString()}] `)
    : "";

  const symbol = symbols[level];
  const formattedMessage = messageColors[level](message);
  const formattedArgs = formatArgs(args);

  const output = `${timestamp}${symbol}  ${formattedMessage}`;

  const write =
    level === "error" || level === "warn" ? console.error : console.log;

  if (formattedArgs.length > 0) {
    write(output, ...formattedArgs);
  } else {
    write(output);
  }
}

type ColumnOptions = {
  headers?: string[];
  widths?: number[];
  gap?: number;
};

function padCell(value: string, width: number): string {
  // Strip ANSI color codes when calculating visible width.
  const visible = value.replace(/\u001B\[[0-9;]*m/g, "");
  const padding = Math.max(0, width - visible.length);

  return value + " ".repeat(padding);
}

function columns(rows: string[][], options: ColumnOptions = {}): void {
  if (rows.length === 0) return;

  const { headers, widths, gap = 2 } = options;
  const allRows = headers ? [headers, ...rows] : rows;
  const columnCount = Math.max(...allRows.map((row) => row.length));

  const columnWidths = Array.from(
    { length: columnCount },
    (_, index) =>
      widths?.[index] ??
      Math.max(
        ...allRows.map(
          (row) => (row[index] ?? "").replace(/\u001B\[[0-9;]*m/g, "").length,
        ),
      ),
  );

  const separator = " ".repeat(gap);

  allRows.forEach((row, rowIndex) => {
    const line = row
      .map((cell, index) => {
        const value = cell ?? "";
        return index === columnCount - 1
          ? value
          : padCell(value, columnWidths[index]);
      })
      .join(separator);

    console.log(headers && rowIndex === 0 ? chalk.cyan.bold(line) : line);
  });
}

export const logger = {
  /** Configure global logger options */
  configure(options: LoggerOptions) {
    globalOptions = { ...globalOptions, ...options };
  },

  info: (message: string, ...args: unknown[]) => log("info", message, ...args),
  success: (message: string, ...args: unknown[]) =>
    log("success", message, ...args),
  warn: (message: string, ...args: unknown[]) => log("warn", message, ...args),
  error: (message: string, ...args: unknown[]) =>
    log("error", message, ...args),
  debug: (message: string, ...args: unknown[]) =>
    log("debug", message, ...args),

  /** Renders a styled banner title box */
  title(titleText: string, options?: TitleOptions) {
    const {
      subtitle,
      tag,
      borderStyle = "round",
      borderColor = "cyan",
      align = "center",
      paddingX = 6,
    } = options || {};

    const contentParts = [
      ...(tag ? [chalk.cyan.bold(`[${tag.toUpperCase()}]`), ""] : []),
      chalk.bold.white(titleText),
      ...(subtitle ? [chalk.gray(subtitle)] : []),
    ];

    const content = contentParts.join("\n");

    const formattedBox = boxen(content, {
      padding: { top: 1, bottom: 1, left: paddingX, right: paddingX },
      borderStyle,
      borderColor,
      align,
    });

    console.log("\n" + formattedBox + "\n");
  },

  subtitle(text: string) {
    console.log(`\n  ${chalk.cyan.bold(text.toUpperCase())}`);
  },

  /** Styled section divider */
  divider(char = "─", length = 60) {
    console.log(chalk.gray(char.repeat(length)));
  },

  /** Empty line separator */
  blank() {
    console.log();
  },

  columns,
};
