"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COMPANY_OPTIONS, getCompanyByLabel } from "@/data/companyKnowledge";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import {
  fetchReportDashboardByPath,
  generateReportDocument,
} from "@/services/api/reportGeneratorApi";
import { getStoredAuthUser, type AuthUser } from "@/services/api/membershipAuthApi";
import type {
  ReportDashboard,
  ReportDashboardMetric,
  ReportProgressItem,
} from "@/types/reportGenerator";

const quarters = ["Q1", "Q2", "Q3", "Q4"];

type ReportStatus = "idle" | "generating" | "interrupted" | "completed";

const idleProgressItems: ReportProgressItem[] = [
  { label: "基本資料生成", status: "待產生" },
  { label: "資產負債分析生成", status: "待產生" },
  { label: "財務比率分析生成", status: "待產生" },
  { label: "還款能力分析生成", status: "待產生" },
  { label: "產業環境分析生成", status: "待產生" },
  { label: "AI 徵審結論生成", status: "待產生" },
];

const initialDashboard: ReportDashboard = {
  summaryItems: ["尚未產生報告，產生完成後將顯示 AI 分析摘要。"],
  progressItems: idleProgressItems,
  progressPercent: 0,
  metricsTitle: "關鍵財務指標",
  metrics: [],
  financialTrends: [],
};

const completedProgressItems: ReportProgressItem[] = idleProgressItems.map((item) => ({
  ...item,
  status: "完成",
}));

function buildGeneratingProgressItems(completedCount: number): ReportProgressItem[] {
  return idleProgressItems.map((item, index) => {
    if (index < completedCount) {
      return { ...item, status: "完成" };
    }
    if (index === completedCount) {
      return { ...item, status: "處理中..." };
    }
    return { ...item, status: "待產生" };
  });
}

const metricIconMap = {
  barChart: BarChart3,
  trendingUp: TrendingUp,
  scale: Scale,
  shieldCheck: ShieldCheck,
  dollarSign: DollarSign,
} as const;

const reportStatusConfig = {
  idle: {
    label: "待產生",
    Icon: Clock,
    className: "border border-[#D8E1E7] bg-[#F6F8FA] text-[#64748B]",
    iconClassName: "",
  },
  generating: {
    label: "產生中",
    Icon: Loader2,
    className: "border border-[#B07D32]/30 bg-[#B07D32]/10 text-[#B07D32]",
    iconClassName: "animate-spin",
  },
  interrupted: {
    label: "產生中斷",
    Icon: AlertTriangle,
    className: "border border-[#B85450]/30 bg-[#B85450]/10 text-[#B85450]",
    iconClassName: "",
  },
  completed: {
    label: "已產生",
    Icon: FileCheck,
    className: "border border-[#A9C8C3] bg-[#EFF7F5] text-[#28665F]",
    iconClassName: "",
  },
} as const;

const reportSections = [
  "項目資訊",
  "公司基本資料",
  "資產負債表",
  "財稅比率表",
  "資產負債分析",
  "還款能力分析",
  "產業環境分析",
];

function formatAmount(value: number) {
  return `${value.toLocaleString("zh-TW")} 億元`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("zh-TW")}%`;
}

function formatReportGeneratedAt(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function FieldLabel(props: { children: ReactNode }) {
  return <label className="text-sm font-semibold text-[#1F2937]">{props.children}</label>;
}

function SelectField(props: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-11">
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {props.children}
      </select>
      <div className="flex min-h-11 w-full items-center rounded-md border border-[#D8E1E7] bg-white px-3 py-2 pr-9 text-sm leading-5 text-[#1F2937] shadow-sm transition-colors peer-focus:border-[#3F8F86] peer-focus:ring-2 peer-focus:ring-[#A9C8C3]/60">
        <span
          className="overflow-hidden"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {props.value}
        </span>
      </div>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
    </div>
  );
}

function MetricCard(props: { item: ReportDashboardMetric }) {
  const Icon = props.item.iconKey ? metricIconMap[props.item.iconKey] : BarChart3;
  const isIncomplete = props.item.calculationStatus === "incomplete";
  const hasCalculationError = isIncomplete || Boolean(props.item.calculationReason);

  return (
    <div
      className={`relative h-full rounded-lg border px-5 py-4 shadow-sm ${
        hasCalculationError
          ? "min-h-[160px] border-[#B85450]/30 bg-[#B85450]/10"
          : "border-[#D8E1E7] bg-white"
      }`}
    >
      <div className={`flex h-full flex-col ${hasCalculationError ? "min-h-[128px]" : ""}`}>
        <div className="flex min-h-10 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              hasCalculationError ? "bg-[#B85450]/15 text-[#B85450]" : "bg-[#EFF7F5] text-[#3F8F86]"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div
            className={`min-w-0 text-sm font-medium leading-5 ${
              hasCalculationError ? "text-[#B85450]" : "text-[#64748B]"
            }`}
          >
            {props.item.label}
          </div>
        </div>

        <div
          className="flex flex-1 flex-col pt-4"
        >
          <div className="flex flex-1 flex-col justify-center">
            <div
              className={`text-2xl font-semibold leading-tight ${
                hasCalculationError ? "text-[#B85450]" : "text-[#1F2937]"
              }`}
            >
              {props.item.value}
            </div>
            {props.item.calculationReason ? (
              <div className="mt-2 text-xs font-semibold text-[#B85450]">計算異常</div>
            ) : null}
          </div>
          <div
            className={`pt-2 text-xs font-semibold ${
              hasCalculationError ? "text-[#B85450]" : "text-[#28665F]"
            }`}
          >
            {props.item.trend}
          </div>
        </div>

        {props.item.calculationReason ? (
          <div className="mt-3 flex min-h-7 items-center">
            <div className="group relative">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#B85450] text-white shadow-sm transition-colors hover:bg-[#9F4744] focus:outline-none focus:ring-2 focus:ring-[#B85450]/30"
                aria-label={`查看${props.item.label}錯誤訊息`}
                title="查看錯誤訊息"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-9 left-0 z-30 w-[min(280px,calc(100vw-3rem))] translate-y-1 rounded-2xl border-2 border-[#B85450]/40 bg-white px-4 py-3 text-sm leading-6 text-[#1F2937] opacity-0 shadow-[0_14px_35px_rgba(31,41,55,0.16)] transition duration-150 before:absolute before:-bottom-2 before:left-5 before:h-4 before:w-4 before:rotate-45 before:border-b-2 before:border-r-2 before:border-[#B85450]/40 before:bg-white group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
              >
                <div className="mb-1 text-xs font-semibold text-[#B85450]">指標計算異常</div>
                <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-1">
                  {props.item.calculationReason}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getCompanyCodeFromLabel(companyLabel: string) {
  return companyLabel.split("/")[1]?.trim() ?? "";
}

function getCompanyTitleFromLabel(companyLabel: string) {
  const [companyName, companyCode, companyShortName] = companyLabel
    .split("/")
    .map((item) => item.trim());

  if (!companyName || !companyCode) return companyLabel;
  return `${companyShortName || companyName}（${companyCode}）`;
}

function getCompanyFullNameFromLabel(companyLabel: string) {
  return companyLabel.split("/")[0]?.trim() ?? companyLabel;
}

function getFallbackCompletedDashboard(year: string): ReportDashboard {
  return {
    summaryItems: ["徵審報告已成功產生，完整內容請開啟下載檔案查看。"],
    progressItems: completedProgressItems,
    progressPercent: 100,
    metricsTitle: `關鍵財務指標（${year} Q1-Q4）`,
    metrics: [],
    financialTrends: [],
  };
}

export default function ReportGeneratorPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.reportGeneratorCreate}>
      <MembershipSessionGuard>
        <ReportGeneratorContent />
      </MembershipSessionGuard>
    </MembershipRouteGuard>
  );
}

function ReportGeneratorContent() {
  const [companyCode, setCompanyCode] = useState(
    () => COMPANY_OPTIONS[0]?.label ?? "",
  );
  const [year, setYear] = useState("2024");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [reportGeneratedAt, setReportGeneratedAt] = useState("");
  const [reportDashboard, setReportDashboard] = useState<ReportDashboard>(initialDashboard);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedCompany = getCompanyByLabel(companyCode);
  const reportCoverImage = selectedCompany?.imagePath ?? "";
  const selectedCompanyTitle = getCompanyTitleFromLabel(companyCode);
  const selectedCompanyFullName = getCompanyFullNameFromLabel(companyCode);
  const reportSubtitle = `${year} 年度徵審報告 Q1 ~ Q4`;
  const reportStatusDetail = reportStatusConfig[reportStatus];
  const ReportStatusIcon = reportStatusDetail.Icon;
  const reportGeneratedBy = authUser?.displayName || authUser?.username || "-";
  const financialTrendRows = reportDashboard.financialTrends;
  const trendStartYear = Number.isFinite(Number(year)) ? Number(year) - 1 : "";
  const trendYearRange = trendStartYear ? `${trendStartYear} - ${year}` : year;

  function stopProgressTimer() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function startProgressTimer(currentYear: string) {
    stopProgressTimer();
    const startedAt = Date.now();
    const durationMs = 5000;
    const maxGeneratingPercent = 80;
    const maxGeneratingCompletedItems = Math.max(0, idleProgressItems.length - 1);

    setReportDashboard({
      summaryItems: ["AI正在產生徵審報告與分析摘要..."],
      progressItems: buildGeneratingProgressItems(0),
      progressPercent: 0,
      metricsTitle: `關鍵財務指標（${currentYear} Q1-Q4）`,
      metrics: [],
      financialTrends: [],
    });

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / durationMs, 1);
      const nextPercent = Math.min(
        maxGeneratingPercent,
        Math.round(ratio * maxGeneratingPercent),
      );
      const completedCount = Math.min(
        maxGeneratingCompletedItems,
        Math.floor(ratio * maxGeneratingCompletedItems),
      );

      setReportDashboard((currentDashboard) => ({
        ...currentDashboard,
        progressItems: buildGeneratingProgressItems(completedCount),
        progressPercent: nextPercent,
      }));

      if (ratio >= 1) {
        stopProgressTimer();
      }
    }, 500);
  }

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  async function generateReport() {
    const selectedCompanyCode = getCompanyCodeFromLabel(companyCode);

    if (!selectedCompanyCode) {
      setGenerationMessage("請先選擇公司代號");
      return;
    }

    setIsGeneratingReport(true);
    setReportStatus("generating");
    setGenerationMessage("");
    setReportGeneratedAt(formatReportGeneratedAt(new Date()));
    startProgressTimer(year);

    try {
      const documentResult = await generateReportDocument({
        companyCode: selectedCompanyCode,
        companyLabel: companyCode,
        year,
        generatedBy: reportGeneratedBy === "-" ? "" : reportGeneratedBy,
      });

      const downloadUrl = URL.createObjectURL(documentResult.blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = documentResult.filename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      stopProgressTimer();
      if (documentResult.dashboardPath) {
        setReportDashboard(await fetchReportDashboardByPath(documentResult.dashboardPath));
      } else {
        setReportDashboard(getFallbackCompletedDashboard(year));
      }
      setReportStatus("completed");
      setGenerationMessage("徵審報告已成功產生並開始下載");
    } catch (error) {
      stopProgressTimer();
      setReportStatus("interrupted");
      setGenerationMessage(
        error instanceof Error ? error.message : "徵審報告產生請求失敗",
      );
      setReportDashboard(initialDashboard);
    } finally {
      setIsGeneratingReport(false);
    }
  }

  return (
    <main className="h-full overflow-y-auto bg-[#F6F8FA]">
      <div className="grid min-h-full gap-5 p-5 xl:grid-cols-[352px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-[#D8E1E7] bg-white shadow-sm">
          <div className="border-b border-[#D8E1E7] px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#3F8F86] text-white">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">報告條件設定</h2>
                <p className="mt-1 text-sm text-[#64748B]">請選擇報告產生條件</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <FieldLabel>公司代號 / 名稱</FieldLabel>
              <SelectField value={companyCode} onChange={setCompanyCode}>
                {COMPANY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-2">
              <FieldLabel>年度</FieldLabel>
              <SelectField value={year} onChange={setYear}>
                <option>2024</option>
                <option>2025</option>
              </SelectField>
            </div>

            {/* <div className="space-y-3">
              <FieldLabel>季別</FieldLabel>
              <div className="grid grid-cols-4 gap-2">
                {quarters.map((quarter) => (
                  <CheckOption
                    key={quarter}
                    label={quarter}
                    checked={selectedQuarters.includes(quarter)}
                    onChange={() => setSelectedQuarters(toggleListValue(selectedQuarters, quarter))}
                  />
                ))}
              </div>
            </div> */}
            <button
              type="button"
              onClick={generateReport}
              disabled={isGeneratingReport}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3F8F86] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#28665F]"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  產生中
                </>
              ) : (
                "產生徵審報告"
              )}
            </button>
            {generationMessage ? (
              <div className="rounded-md border border-[#A9C8C3] bg-[#EFF7F5] px-3 py-2 text-center text-xs font-medium text-[#28665F]">
                {generationMessage}
              </div>
            ) : null}
            <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
              <Sparkles className="h-4 w-4" />
              報告產生完成後，將自動下載完整報告
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="relative rounded-lg border border-[#D8E1E7] bg-white p-5 pb-16 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative h-[122px] w-[250px] max-w-full shrink-0 overflow-hidden rounded-lg bg-white">
                  {reportCoverImage ? (
                    <Image
                      key={reportCoverImage}
                      src={reportCoverImage}
                      alt={`${selectedCompany?.label ?? "公司"}徵審報告封面`}
                      fill
                      sizes="250px"
                      className="object-contain"
                      priority
                    />
                  ) : null}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-[#1F2937]">{selectedCompanyTitle}</h1>
                  <p className="mt-2 text-xl text-[#1F2937]">
                    {selectedCompanyFullName}
                  </p>
                  <p className="mt-1 text-base font-medium text-[#64748B]">{reportSubtitle}</p>
                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#64748B]">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      產生時間：{reportGeneratedAt || "-"}
                    </span>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      產生人員：{reportGeneratedBy}
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${reportStatusDetail.className}`}
                aria-live="polite"
              >
                <ReportStatusIcon className={`h-4 w-4 ${reportStatusDetail.iconClassName}`} />
                {reportStatusDetail.label}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <section className="rounded-lg border border-[#D8E1E7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1F2937]">AI 分析摘要</h2>
              <div className="mt-4 rounded-lg border border-[#A9C8C3] bg-[#EFF7F5] p-4">
                <div className="space-y-4">
                  {reportDashboard.summaryItems.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-6 text-[#1F2937]">
                      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 fill-[#3F8F86] text-white" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#D8E1E7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1F2937]">報告產生進度</h2>
              <div className="mt-4 space-y-3">
                {reportDashboard.progressItems.map((item) => {
                  const done = item.status === "完成";
                  const processing = item.status.includes("處理中");
                  return (
                    <div key={item.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${done ? "bg-[#3F8F86]" : processing ? "bg-[#B07D32]" : "bg-[#D8E1E7]"}`}>
                        {done ? <Check className="h-3.5 w-3.5" /> : processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      </span>
                      <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                        <span className="text-sm font-semibold text-[#1F2937]">{item.label}</span>
                        <span className="h-px bg-[#D8E1E7]" />
                      </div>
                      <span className={done ? "text-sm font-semibold text-[#28665F]" : processing ? "text-sm font-semibold text-[#B07D32]" : "text-sm text-[#64748B]"}>
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#E5EAEF]">
                  <div
                    className="h-full rounded-full bg-[#3F8F86] transition-all"
                    style={{ width: `${reportDashboard.progressPercent}%` }}
                  />
                </div>
                <span className="text-base font-semibold text-[#28665F]">
                  {reportDashboard.progressPercent}%
                </span>
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-[#D8E1E7] bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937]">{reportDashboard.metricsTitle}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              {reportDashboard.metrics.length ? reportDashboard.metrics.map((item) => (
                <MetricCard key={item.label} item={item} />
              )) : (
                <div className="col-span-full rounded-md border border-dashed border-[#D8E1E7] px-4 py-8 text-center text-sm text-[#64748B]">
                  產生報告後將顯示關鍵財務指標。
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <section className="rounded-lg border border-[#D8E1E7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1F2937]">報告目錄</h2>
              <div className="mt-4 space-y-3">
                {reportSections.map((section, index) => (
                  <div key={section} className="flex items-center gap-3 text-sm font-medium text-[#1F2937]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#659B94] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{section}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#D8E1E7] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#1F2937]">財務趨勢圖</h2>
                <span className="text-xs font-medium text-[#64748B]">
                  {trendYearRange} Q1-Q4
                </span>
              </div>
              <div className="mt-5 h-[340px] min-w-0 overflow-x-auto">
                {financialTrendRows.length ? (
                  <div className="h-full min-w-[760px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={financialTrendRows}
                      margin={{ top: 8, right: 12, bottom: 22, left: 8 }}
                      barGap={4}
                      barCategoryGap="16%"
                    >
                      <CartesianGrid stroke="#E5EAEF" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="period"
                        interval={0}
                        axisLine={{ stroke: "#D8E1E7" }}
                        tickLine={false}
                        tick={{ fill: "#64748B", fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="amount"
                        width={58}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748B", fontSize: 12 }}
                        tickFormatter={(value: number) => value.toLocaleString("zh-TW")}
                        label={{
                          value: "億元",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#64748B",
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        yAxisId="margin"
                        orientation="right"
                        width={44}
                        domain={[0, 70]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748B", fontSize: 12 }}
                        tickFormatter={(value: number) => formatPercent(value)}
                        label={{
                          value: "%",
                          angle: 90,
                          position: "insideRight",
                          fill: "#64748B",
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "#F6F8FA" }}
                        formatter={(value, name) => {
                          if (value === null || value === undefined) {
                            return ["-", name];
                          }
                          const numericValue = Number(value);
                          return [
                            name === "毛利率"
                              ? formatPercent(numericValue)
                              : formatAmount(numericValue),
                            name,
                          ];
                        }}
                        contentStyle={{
                          borderColor: "#D8E1E7",
                          borderRadius: 8,
                          color: "#1F2937",
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: 12, fontSize: 13 }}
                      />
                      <Bar
                        yAxisId="amount"
                        dataKey="revenue"
                        name="營收"
                        fill="#3F8F86"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="amount"
                        dataKey="netIncome"
                        name="淨利"
                        fill="#91AAA6"
                        radius={[4, 4, 0, 0]}
                      >
                        {financialTrendRows.map((entry) => (
                          <Cell
                            key={`net-income-${entry.period}`}
                            fill={Number(entry.netIncome) < 0 ? "#B85450" : "#91AAA6"}
                          />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="margin"
                        type="monotone"
                        dataKey="grossMargin"
                        name="毛利率"
                        stroke="#285C57"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#285C57", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#285C57", stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[#D8E1E7] px-4 text-center text-sm text-[#64748B]">
                    產生報告後將顯示財務趨勢圖。
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>

      <footer className="border-t border-[#D8E1E7] bg-white py-3 text-center text-sm text-[#64748B]">
        Copyright © AITC 慶燁科技 All Rights Reserved.
      </footer>
        </main>
  );
}
