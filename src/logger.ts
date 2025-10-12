/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

/**
 * 日志级别字符串映射
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.OFF]: "OFF",
};

/**
 * 日志级别颜色代码 (用于终端输出)
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[36m", // 青色
  [LogLevel.INFO]: "\x1b[32m", // 绿色
  [LogLevel.WARN]: "\x1b[33m", // 黄色
  [LogLevel.ERROR]: "\x1b[31m", // 红色
  [LogLevel.OFF]: "\x1b[0m", // 重置
};

const RESET_COLOR = "\x1b[0m";

/**
 * Logger 类 - 提供结构化日志功能
 */
class Logger {
  private level: LogLevel;
  private enableColors: boolean;

  constructor() {
    // 从环境变量读取日志级别，默认为 INFO
    this.level = this.parseLogLevel(process.env.LOG_LEVEL || "INFO");
    // 从环境变量读取是否启用颜色，默认启用
    this.enableColors = process.env.LOG_COLORS !== "false";
  }

  /**
   * 解析日志级别字符串
   */
  private parseLogLevel(level: string): LogLevel {
    const upperLevel = level.toUpperCase();
    switch (upperLevel) {
      case "DEBUG":
        return LogLevel.DEBUG;
      case "INFO":
        return LogLevel.INFO;
      case "WARN":
        return LogLevel.WARN;
      case "ERROR":
        return LogLevel.ERROR;
      case "OFF":
        return LogLevel.OFF;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.formatTimestamp();
    const levelName = LOG_LEVEL_NAMES[level];
    const color = this.enableColors ? LOG_LEVEL_COLORS[level] : "";
    const reset = this.enableColors ? RESET_COLOR : "";

    let formattedMessage = `${timestamp} ${color}[${levelName}]${reset} ${message}`;

    // 如果有额外数据，添加到消息中
    if (data !== undefined) {
      if (typeof data === "object") {
        formattedMessage += ` ${JSON.stringify(data)}`;
      } else {
        formattedMessage += ` ${data}`;
      }
    }

    return formattedMessage;
  }

  /**
   * 通用日志输出方法
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) {
      return; // 低于当前日志级别，不输出
    }

    const formattedMessage = this.formatMessage(level, message, data);

    // 根据日志级别选择输出流
    if (level >= LogLevel.WARN) {
      console.error(formattedMessage);
    } else {
      console.error(formattedMessage); // MCP 服务器统一使用 stderr
    }
  }

  /**
   * DEBUG 级别日志 - 详细的调试信息
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * INFO 级别日志 - 一般信息
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * WARN 级别日志 - 警告信息
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * ERROR 级别日志 - 错误信息
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 启用/禁用颜色
   */
  setColors(enabled: boolean): void {
    this.enableColors = enabled;
  }
}

// 导出单例
export const logger = new Logger();
