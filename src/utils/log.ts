import chalk, { ChalkInstance } from 'chalk';
import log from 'loglevel';
import prefixer from 'loglevel-plugin-prefix';

export type Logger = log.Logger
export type LogLevel = log.LogLevelDesc
export const levels = log.levels
export const colors = chalk

export class LoggerFactory {
  logLevel: LogLevel

  constructor(logLevel: LogLevel) {
    this.logLevel = logLevel
  }

  getLogger(name: string, color: ChalkInstance = chalk.gray): Logger {
    // logger.log() and logger.debug() are of level DEBUG
    const logger = log.getLogger(name)
    logger.setLevel(this.logLevel)
    prefixer.apply(logger, {
      format(level, name, timestamp) {
        return (
          '' +
          chalk.hex('#aaa')(`${timestamp}`) +
          ' ' +
          color.bold(name) +
          chalk.reset(' ') +
          `[${levelColors[level.toUpperCase()](level)}]`
        )
      },
    })
    return logger
  }
}

const levelColors: { [key: string]: ChalkInstance } = {
  TRACE: chalk.magenta,
  DEBUG: chalk.hex('#aaa'),
  INFO: chalk.blue,
  WARN: chalk.yellow,
  ERROR: chalk.red,
}

prefixer.reg(log)


/* default level and factory */

export const defaultLogLevel = levels.DEBUG
export const loggerFactory = new LoggerFactory(defaultLogLevel)

export function getLogger(name: string, color?: ChalkInstance): Logger {
  return loggerFactory.getLogger(name, color)
}
