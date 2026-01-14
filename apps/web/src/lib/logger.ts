/**
 * ロガーユーティリティ
 * 開発環境と本番環境で適切にログを出力・管理する
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogData {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/**
 * 外部ログサービスへの送信設定
 */
export interface ExternalLogServiceConfig {
  /** 送信関数 */
  sendLog: (logData: LogData) => void | Promise<void>;
  /** エラーログのみ送信 */
  errorOnly?: boolean;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private externalService?: ExternalLogServiceConfig;

  /**
   * 外部ログサービスを設定
   */
  configure(config: ExternalLogServiceConfig): void {
    this.externalService = config;
  }

  /**
   * 内部ログ出力メソッド
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // 開発環境以外でdebugログは出力しない
    if (!this.isDevelopment && level === "debug") {
      return;
    }

    const logData: LogData = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    // dataが存在する場合のみ追加
    if (data !== undefined) {
      logData.data = data;
    }

    // 構造化ログとして出力
    const logString = JSON.stringify(logData);

    switch (level) {
      case "error":
        console.error(logString);
        break;
      case "warn":
        console.warn(logString);
        break;
      case "info":
        console.info(logString);
        break;
      default:
        console.log(logString);
        break;
    }

    // 本番環境では外部ログサービスに送信
    if (!this.isDevelopment && this.externalService) {
      const shouldSend =
        !this.externalService.errorOnly || level === "error";
      if (shouldSend) {
        this.externalService.sendLog(logData);
      }
    }
  }

  /**
   * デバッグログ（開発環境のみ）
   */
  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  /**
   * 情報ログ
   */
  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  /**
   * 警告ログ
   */
  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  /**
   * エラーログ
   */
  error(message: string, error?: unknown): void {
    this.log("error", message, error);
  }
}

/**
 * シングルトンロガーインスタンス
 */
export const logger = new Logger();
