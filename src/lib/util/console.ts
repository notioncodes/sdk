import { gray, green, magenta, redBright, white } from "ansis";
import ora from "ora";
import { Subject } from "rxjs";

export const monitor = {
  duration: 0,
  error: 0,
  success: 0,
  throughput: 0,
  messages: [] as string[]
};

export type MonitorData = {
  duration?: number;
  error?: number;
  success?: number;
  throughput?: number;
  message?: string;
  messages?: string[];
};

export interface ConsoleMonitor {
  next: (data: MonitorData) => void;
  stop: (message?: string) => void;
  fail: (message?: string) => void;
  cleanup: () => void;
}

export const cons = (): ConsoleMonitor => {
  const subject = new Subject<MonitorData>();
  const spinner = ora({
    text: "\n",
    spinner: "dots"
  }).start();

  let messageHistory: string[] = [];

  subject.subscribe((data) => {
    if (data.message) {
      messageHistory.push(`${gray(new Date().toLocaleTimeString())} ${data.message}`);
    }
    if (data.messages) {
      messageHistory.push(...data.messages.map((message) => `${gray(new Date().toLocaleTimeString())} ${message}`));
    }

    if (messageHistory.length > 10) {
      messageHistory = messageHistory.slice(-15);
    }

    const metricsLine = gray(
      `duration: ${white(data.duration || 0)}ms | errors: ${redBright(data.error || 0)} | success: ${green(data.success || 0)} | throughput: ${magenta(data.throughput || 0)}/s\n`
    );

    const currentMessage = messageHistory.length > 0 ? messageHistory[messageHistory.length - 1] : "processing...";
    const prefixLines = [metricsLine, ...messageHistory.slice(0, -1)].filter((line) => line.trim().length > 0);

    spinner.prefixText = prefixLines.join("\n");
    // spinner.text = currentMessage ?? "processing...";
  });

  return {
    next: (data: MonitorData) => {
      subject.next(data);
    },
    stop: (message: string = "search operation completed") => {
      subject.complete();
      spinner.succeed(message);
    },
    fail: (message: string = "search operation failed") => {
      subject.complete();
      spinner.fail(message);
    },
    cleanup: () => {
      subject.complete();
      spinner.stop();
    }
  };
};
