export type LogLevel = "debug" | "info" | "warn" | "error";

type LogWriter = (message: string) => void;

const levelRanks: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): LogLevel {
  const configured = process.env.RETRIEVAL_LENS_LOG;
  return configured === "debug" || configured === "info" || configured === "warn" || configured === "error"
    ? configured
    : "warn";
}

function write(level: LogLevel, message: string, writer: LogWriter = process.stderr.write.bind(process.stderr)): void {
  if (levelRanks[level] >= levelRanks[configuredLevel()]) {
    writer(`[${level}] ${message}\n`);
  }
}

export const logger = {
  debug(message: string): void {
    write("debug", message);
  },
  info(message: string): void {
    write("info", message);
  },
  warn(message: string): void {
    write("warn", message);
  },
  error(message: string): void {
    write("error", message);
  },
};
