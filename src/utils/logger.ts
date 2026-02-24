import chalk from "chalk";
import ora, { type Ora } from "ora";

export const log = {
  info: (msg: string) => console.log(chalk.blue("i"), msg),
  success: (msg: string) => console.log(chalk.green("✓"), msg),
  warn: (msg: string) => console.log(chalk.yellow("!"), msg),
  error: (msg: string) => console.error(chalk.red("x"), msg),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  title: (msg: string) => console.log(chalk.bold.cyan(`\n${msg}\n`)),
  label: (label: string, value: string) =>
    console.log(`  ${chalk.gray(label.padEnd(20))} ${value}`),
  divider: () => console.log(chalk.dim("─".repeat(50))),
  newline: () => console.log(),
};

export function spinner(text: string): Ora {
  return ora({ text, color: "cyan" }).start();
}

export function table(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxRow = rows.reduce((max, row) => Math.max(max, (row[i] || "").length), 0);
    return Math.max(h.length, maxRow) + 2;
  });

  const headerLine = headers.map((h, i) => chalk.bold(h.padEnd(colWidths[i]))).join("");
  const separator = colWidths.map((w) => chalk.dim("─".repeat(w))).join("");

  console.log(headerLine);
  console.log(separator);
  for (const row of rows) {
    const line = row.map((cell, i) => (cell || "").padEnd(colWidths[i])).join("");
    console.log(line);
  }
}
