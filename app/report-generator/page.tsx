"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  CircleCheck,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import { COMPANY_OPTIONS, getCompanyByLabel } from "@/data/companyKnowledge";
import { BACKEND_API_PATHS, buildBackendApiUrl } from "@/utils/api";

const quarters = ["Q1", "Q2", "Q3", "Q4"];

const progressItems = [
  { label: "財務報表分析", status: "完成" },
  { label: "現金流量分析", status: "完成" },
  { label: "產業分析", status: "完成" },
  { label: "新聞風險分析", status: "完成" },
  { label: "AI 徵審結論生成", status: "處理中..." },
];

const summaryItems = [
  "台積電 2025 年營收持續成長，較去年同期成長 24.3%。",
  "現金流量穩定，營運活動現金流充沛，財務結構健全。",
  "半導體產業景氣持續擴張，AI 需求強勁，長期展望正向。",
  "資本支出雖高，但在產業競爭力與技術領先下屬可接受範圍。",
];

const metrics = [
  { label: "ROE", value: "18.2%", trend: "▲ 2.4% YoY", icon: BarChart3, tone: "blue" },
  { label: "流動比率", value: "165%", trend: "▲ 12% YoY", icon: TrendingUp, tone: "cyan" },
  { label: "負債比率", value: "42%", trend: "▼ 3% YoY", icon: Scale, tone: "green" },
  { label: "利息保障倍數", value: "12.4", trend: "▲ 1.8 YoY", icon: ShieldCheck, tone: "teal" },
  { label: "營收成長率", value: "24.3%", trend: "▲ 6.7% YoY", icon: TrendingUp, tone: "purple" },
  { label: "每股盈餘 (EPS)", value: "45.32", trend: "▲ 15.2% YoY", icon: DollarSign, tone: "emerald" },
];

const reportSections = [
  "公司概要",
  "財務分析",
  "現金流量分析",
  "產業分析",
  "新聞風險分析",
  "AI 徵審結論",
  "附錄：財務報表",
];

const chartRows = [
  { period: "2024 Q1", revenue: 46, profit: 14, margin: 49 },
  { period: "2024 Q2", revenue: 50, profit: 15, margin: 51 },
  { period: "2024 Q3", revenue: 56, profit: 17, margin: 53 },
  { period: "2024 Q4", revenue: 60, profit: 17, margin: 52 },
  { period: "2025 Q1", revenue: 62, profit: 17, margin: 51 },
  { period: "2025 Q2", revenue: 64, profit: 19, margin: 53 },
  { period: "2025 Q4", revenue: 66, profit: 21, margin: 54 },
];

const peers = [
  { name: "台積電 (2330)", value: 53.1, highlight: true },
  { name: "三星 (005930.KS)", value: 41.2 },
  { name: "英特爾 (INTC)", value: 34.7 },
  { name: "聯電 (2303)", value: 29.8 },
  { name: "中芯國際 (0981.HK)", value: 21.4 },
];

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
  return <label className="text-sm font-semibold text-slate-900">{props.children}</label>;
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
      <div className="flex min-h-11 w-full items-center rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm leading-5 text-slate-900 shadow-sm transition-colors peer-focus:border-teal-500 peer-focus:ring-2 peer-focus:ring-teal-100">
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
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function MetricCard(props: { item: (typeof metrics)[number] }) {
  const Icon = props.item.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm font-medium text-slate-700">{props.item.label}</div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{props.item.value}</div>
          <div className="mt-2 text-xs font-semibold text-emerald-700">{props.item.trend}</div>
        </div>
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

function getFilenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return "";

  const encodedFilename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  if (encodedFilename) {
    return decodeURIComponent(encodedFilename);
  }

  return contentDisposition.match(/filename="([^"]+)"/)?.[1] ?? "";
}

export default function ReportGeneratorPage() {
  const [companyCode, setCompanyCode] = useState(
    "台灣積體電路製造股份有限公司 / 2330 / 台積電",
  );
  const [year, setYear] = useState("2024");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [reportGeneratedAt, setReportGeneratedAt] = useState("");

  const selectedCompany = getCompanyByLabel(companyCode);
  const reportCoverImage = selectedCompany?.imagePath ?? "";
  const selectedCompanyTitle = getCompanyTitleFromLabel(companyCode);
  const selectedCompanyFullName = getCompanyFullNameFromLabel(companyCode);
  const reportSubtitle = `${year} 年度徵審報告 Q1 ~ Q4`;

  async function generateReport() {
    const selectedCompanyCode = getCompanyCodeFromLabel(companyCode);

    if (!selectedCompanyCode) {
      setGenerationMessage("請先選擇公司代號");
      return;
    }

    setIsGeneratingReport(true);
    setGenerationMessage("");
    setReportGeneratedAt(formatReportGeneratedAt(new Date()));

    try {
      const response = await fetch(buildBackendApiUrl(BACKEND_API_PATHS.reportGeneratorGenerate), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          companyLabel: companyCode,
          year,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        const errorPayload = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : null;
        const errorText = errorPayload ? "" : await response.text().catch(() => "");
        const errorMessage =
          errorPayload?.detail ??
          errorPayload?.error ??
          (errorText || "徵審報告產生請求失敗");
        throw new Error(errorMessage);
      }

      const reportBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(reportBlob);
      const responseFilename = getFilenameFromContentDisposition(
        response.headers.get("content-disposition"),
      );
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = responseFilename || `${selectedCompanyCode}_${year}_credit_report.docx`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setGenerationMessage("徵審報告已成功產生並開始下載");
    } catch (error) {
      setGenerationMessage(
        error instanceof Error ? error.message : "徵審報告產生請求失敗",
      );
    } finally {
      setIsGeneratingReport(false);
    }
  }

  return (
    <main className="h-full overflow-y-auto bg-slate-50">
      <div className="grid min-h-full gap-5 p-5 xl:grid-cols-[352px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-600 text-white">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">報告條件設定</h2>
                <p className="mt-1 text-sm text-slate-500">請選擇報告產生條件</p>
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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
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
              <div className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-center text-xs font-medium text-teal-800">
                {generationMessage}
              </div>
            ) : null}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Sparkles className="h-4 w-4" />
              報告產生完成後，將自動下載完整報告
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                  <h1 className="text-3xl font-semibold text-slate-950">{selectedCompanyTitle}</h1>
                  <p className="mt-2 text-xl text-slate-900">
                    {selectedCompanyFullName}
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-600">{reportSubtitle}</p>
                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      產生時間：{reportGeneratedAt || "-"}
                    </span>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      產生人員：張小明
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-5 lg:items-end">
                <span className="inline-flex items-center gap-2 rounded-md bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
                  <Check className="h-4 w-4" />
                  分析完成
                </span>
             
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">AI 分析摘要</h2>
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="space-y-4">
                  {summaryItems.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-6 text-slate-900">
                      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 fill-emerald-600 text-white" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">報告產生進度</h2>
              <div className="mt-4 space-y-3">
                {progressItems.map((item, index) => {
                  const done = item.status === "完成";
                  return (
                    <div key={item.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white">
                        {done ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      </span>
                      <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                        <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                        <span className="h-px bg-slate-200" />
                      </div>
                      <span className={done ? "text-sm font-semibold text-teal-700" : "text-sm text-slate-500"}>
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[72%] rounded-full bg-teal-500" />
                </div>
                <span className="text-base font-semibold text-teal-700">72%</span>
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">關鍵財務指標（2025 Q1-Q4）</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              {metrics.map((item) => (
                <MetricCard key={item.label} item={item} />
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_300px]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">報告目錄</h2>
              <div className="mt-4 space-y-3">
                {reportSections.map((section, index) => (
                  <div key={section} className="flex items-center gap-3 text-sm font-medium text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{section}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">財務趨勢圖</h2>
              <div className="mt-3 flex flex-wrap justify-center gap-8 text-sm text-slate-700">
                <span className="flex items-center gap-2"><span className="h-3 w-8 rounded bg-teal-500" />營收（億元）</span>
                <span className="flex items-center gap-2"><span className="h-3 w-8 rounded bg-green-300" />淨利（億元）</span>
                <span className="flex items-center gap-2"><span className="h-1 w-8 rounded bg-blue-700" />毛利率（%）</span>
              </div>
              <div className="mt-5 grid min-h-[260px] grid-cols-[52px_1fr] gap-3">
                <div className="flex flex-col justify-between pb-8 text-xs text-slate-700">
                  <span>8,000</span>
                  <span>6,000</span>
                  <span>4,000</span>
                  <span>2,000</span>
                  <span>0</span>
                </div>
                <div className="relative border-b border-slate-300">
                  <div className="absolute inset-0 grid grid-rows-4">
                    <span className="border-t border-slate-200" />
                    <span className="border-t border-slate-200" />
                    <span className="border-t border-slate-200" />
                    <span className="border-t border-slate-200" />
                  </div>
                  <div className="relative flex h-[220px] items-end justify-around gap-3 px-3">
                    {chartRows.map((row, index) => (
                      <div key={row.period} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <div className="flex h-[190px] items-end gap-2">
                          <span className="w-4 rounded-t bg-teal-500" style={{ height: `${row.revenue}%` }} />
                          <span className="w-4 rounded-t bg-green-300" style={{ height: `${row.profit * 2}%` }} />
                        </div>
                        <span className="whitespace-nowrap text-xs text-slate-700">{row.period}</span>
                        <span
                          className="absolute h-3 w-3 rounded-full bg-blue-700"
                          style={{
                            bottom: `${row.margin + 22}%`,
                            left: `${10 + index * 13.4}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">同業比較（毛利率）</h2>
              <div className="mt-5 space-y-5">
                {peers.map((peer) => (
                  <div key={peer.name} className="grid grid-cols-[110px_1fr_48px] items-center gap-3 text-sm">
                    <span className="font-medium text-slate-800">{peer.name}</span>
                    <span className="h-3 overflow-hidden rounded bg-slate-200">
                      <span
                        className={peer.highlight ? "block h-full rounded bg-teal-500" : "block h-full rounded bg-slate-300"}
                        style={{ width: `${peer.value}%` }}
                      />
                    </span>
                    <span className={peer.highlight ? "font-semibold text-teal-700" : "text-slate-700"}>
                      {peer.value}%
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-6 h-11 w-full rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
              >
                查看更多同業比較
              </button>
            </section>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white py-3 text-center text-sm text-slate-700">
        Copyright © AITC 慶燁科技 All Rights Reserved.
      </footer>
    </main>
  );
}
