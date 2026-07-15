import type {
  GenerateReportPayload,
  HistoricalReport,
  ReportDashboard,
  ReportDocumentResult,
  ReportHistoryResult,
} from "@/types/reportGenerator";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

type ErrorPayload = {
  detail?: string;
  error?: string;
};

type ReportHistoryResponse = Partial<ReportHistoryResult> & ErrorPayload;

type ReportDashboardResponse = {
  dashboard?: ReportDashboard;
} & ErrorPayload;

function getFilenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return "";

  const encodedFilename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  if (encodedFilename) {
    return decodeURIComponent(encodedFilename);
  }

  return contentDisposition.match(/filename="([^"]+)"/)?.[1] ?? "";
}

async function readJsonResponse<T extends ErrorPayload>(
  response: Response,
  fallbackMessage: string,
) {
  const json = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    throw new Error(json?.detail ?? json?.error ?? fallbackMessage);
  }

  if (!json) {
    throw new Error(fallbackMessage);
  }

  return json;
}

async function readDocumentResponse(
  response: Response,
  fallbackFilename: string,
  fallbackErrorMessage: string,
): Promise<ReportDocumentResult> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const errorPayload = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as ErrorPayload | null)
      : null;
    const errorText = errorPayload ? "" : await response.text().catch(() => "");
    throw new Error(
      errorPayload?.detail ??
        errorPayload?.error ??
        (errorText || fallbackErrorMessage),
    );
  }

  return {
    blob: await response.blob(),
    filename:
      getFilenameFromContentDisposition(response.headers.get("content-disposition")) ||
      fallbackFilename,
    dashboardPath: response.headers.get("x-report-dashboard-path") ?? "",
  };
}

export async function fetchReportHistory(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}) {
  const offset = (params.page - 1) * params.pageSize;
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    offset: String(offset),
  });

  if (params.keyword?.trim()) {
    searchParams.set("keyword", params.keyword.trim());
  }
  if (params.status?.trim()) {
    searchParams.set("status", params.status.trim());
  }

  const json = await readJsonResponse<ReportHistoryResponse>(
    await fetchBackendApi(
      `${BACKEND_API_PATHS.reportGeneratorHistory}?${searchParams.toString()}`,
      { cache: "no-store" },
    ),
    "歷史報告載入失敗",
  );

  return {
    ...json,
    reports: Array.isArray(json.reports) ? json.reports : [],
  };
}

export async function fetchReportDashboard(reportId: string) {
  return fetchReportDashboardByPath(
    `${BACKEND_API_PATHS.reportGeneratorHistory}/${reportId}/dashboard`,
  );
}

export async function fetchReportDashboardByPath(path: string) {
  const json = await readJsonResponse<ReportDashboardResponse>(
    await fetchBackendApi(path, { cache: "no-store" }),
    "報告資訊載入失敗",
  );

  if (!json.dashboard) {
    throw new Error("報告資訊格式不正確");
  }

  return {
    ...json.dashboard,
    financialTrends: json.dashboard.financialTrends ?? [],
  };
}

export async function downloadReportHistoryDocument(report: HistoricalReport) {
  return readDocumentResponse(
    await fetchBackendApi(
      `${BACKEND_API_PATHS.reportGeneratorHistory}/${report.publicId}/download`,
    ),
    report.fileName || `${report.id}.docx`,
    "歷史報告下載失敗",
  );
}

export async function generateReportDocument(payload: GenerateReportPayload) {
  return readDocumentResponse(
    await fetchBackendApi(BACKEND_API_PATHS.reportGeneratorGenerate, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      body: JSON.stringify(payload),
    }),
    `${payload.companyCode}_${payload.year}_credit_report.docx`,
    "徵審報告產生請求失敗",
  );
}
