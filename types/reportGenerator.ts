export type ReportStatus = "已完成" | "產生中" | "失敗";

export type HistoricalReport = {
  id: string;
  publicId: string;
  title: string;
  company: string;
  year: string;
  period: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  status: ReportStatus;
  fileSize: string;
  fileName?: string;
};

export type ReportHistoryResult = {
  reports: HistoricalReport[];
  total?: number;
  page?: number;
  pageSize?: number;
  offset?: number;
};

export type ReportProgressItem = {
  label: string;
  status: string;
};

export type ReportDashboardMetric = {
  label: string;
  value: string;
  trend: string;
  iconKey?: "barChart" | "trendingUp" | "scale" | "shieldCheck" | "dollarSign";
  calculationStatus?: "complete" | "incomplete";
  calculationReason?: string;
};

export type ReportFinancialTrend = {
  period: string;
  revenue: number | null;
  netIncome: number | null;
  grossMargin: number | null;
};

export type ReportDashboard = {
  id?: string;
  historyId?: string;
  summaryItems: string[];
  progressItems: ReportProgressItem[];
  progressPercent: number;
  metricsTitle: string;
  metrics: ReportDashboardMetric[];
  financialTrends: ReportFinancialTrend[];
  createdAt?: string;
  updatedAt?: string;
};

export type GenerateReportPayload = {
  companyCode: string;
  companyLabel: string;
  year: string;
  generatedBy: string;
};

export type ReportDocumentResult = {
  blob: Blob;
  filename: string;
  dashboardPath: string;
};
