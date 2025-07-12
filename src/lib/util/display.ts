import { gray, green, magenta, redBright, white } from "ansis";
import ora from "ora";
import { Subject } from "rxjs";

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

export const display = (): ConsoleMonitor => {
  const subject = new Subject<MonitorData>();
  const spinner = ora({
    text: "\n",
    spinner: "dots"
  }).start();

  const messageHistory: string[] = [];

  subject.subscribe((data) => {
    if (data.message) {
      messageHistory.push(`${gray(new Date().toLocaleTimeString())} ${data.message}`);
    } else if (data.messages) {
      messageHistory.push(...data.messages.map((message) => `${gray(new Date().toLocaleTimeString())} ${message}`));
    }

    spinner.prefixText = [
      gray(
        `duration: ${white(data.duration ? Math.round(data.duration / 1000) : 0)}s | errors: ${redBright(data.error || 0)} | success: ${green(data.success || 0)} | throughput: ${magenta(data.throughput || 0)}/s`
      ),
      ...messageHistory.slice(-15)
    ]
      .filter((line) => line.trim().length > 0)
      .join("\n");
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
