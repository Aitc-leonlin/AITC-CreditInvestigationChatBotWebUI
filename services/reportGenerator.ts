import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type GenerateCreditReportInput = {
  companyCode: string;
  companyLabel?: string;
  year: string;
};

export type GenerateCreditReportResult = {
  jobId: string;
  reportPath: string;
  status: "generated";
};

export async function generateCreditReport(
  input: GenerateCreditReportInput,
): Promise<GenerateCreditReportResult> {
  console.log("[generateCreditReport] received input:", input);

  const scriptPath = path.join(
    process.cwd(),
    "docx",
    "generate_credit_report.py",
  );
  const backendRoot =
    process.env.REPORT_GENERATOR_BACKEND_ROOT ??
    "/Users/leonlin/Cursor/BackEnd/AITC-CreditInvestigationChatBotAgent";
  const outputDir =
    process.env.REPORT_GENERATOR_OUTPUT_DIR ??
    path.join(backendRoot, "generated-reports");
  const backendVenvPython = path.join(backendRoot, "venv", "bin", "python");
  const frontendVenvPython = path.join(process.cwd(), "venv", "bin", "python");
  const pythonCommand =
    process.env.REPORT_GENERATOR_PYTHON ??
    (existsSync(backendVenvPython)
      ? backendVenvPython
      : existsSync(frontendVenvPython)
        ? frontendVenvPython
        : "python3");
  const backendDbPath = process.env.REPORT_GENERATOR_DB_PATH ?? "";

  const args = [
    scriptPath,
    "--company-code",
    input.companyCode,
    "--company-label",
    input.companyLabel ?? "",
    "--year",
    input.year,
    "--output-dir",
    outputDir,
    "--backend-root",
    backendRoot,
  ];

  if (backendDbPath) {
    args.push("--db-path", backendDbPath);
  }

  const { stdout, stderr } = await execFileAsync(
    pythonCommand,
    args,
    {
      timeout: 120000,
    },
  );

  if (stderr.trim()) {
    console.log("[generateCreditReport] python stderr:", stderr.trim());
  }

  const parsedOutput = JSON.parse(stdout.trim()) as {
    reportPath?: string;
    status?: string;
  };

  return {
    jobId: `credit-report-${input.companyCode}-${input.year}-${Date.now()}`,
    reportPath: parsedOutput.reportPath ?? "",
    status: "generated",
  };
}
