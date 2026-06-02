"use client";

import { cn } from "@/utils/cn";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import Link from "next/link";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";
import FunctionsIcon from "@mui/icons-material/Functions";
import { Bot, Database, FileText, Home } from "lucide-react";
import {
  METRIC_FORMULA_CATEGORIES,
  getMetricFormulaCategoryLabel,
  getMetricFormulasByCategory,
  type MetricFormulaCategoryKey,
} from "@/data/metricFormula";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export const ActiveLink = (props: {
  href: string;
  children: ReactNode;
  icon: ReactNode;
}) => {
  const pathname = usePathname();
  const isActive =
    pathname === props.href ||
    (props.href !== "/" && pathname.startsWith(`${props.href}/`));
  return (
    <Link
      href={props.href}
      className={cn(
        "rounded-full border border-[#cfe4f2] bg-white px-4 py-2 text-sm font-medium text-[#12344a] transition-colors duration-200",
        "flex items-center gap-2 whitespace-nowrap",
        !isActive &&
          "hover:border-[#57A6D4] hover:bg-[#eef7fc] hover:text-[#0f3f5d]",
        isActive && "cursor-default border-[#57A6D4] bg-[#57A6D4] text-white",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span>{props.children}</span>
      <span
        className={cn(
          "flex items-center text-[#57A6D4] transition-colors",
          isActive ? "text-white" : "group-hover:text-[#0f3f5d]",
        )}
      >
        {props.icon}
      </span>
    </Link>
  );
};

const navButtonClassName =
  "rounded-full border border-[#cfe4f2] bg-white px-4 py-2 text-sm font-medium text-[#12344a] transition-colors duration-200 flex items-center gap-2 whitespace-nowrap hover:border-[#57A6D4] hover:bg-[#eef7fc] hover:text-[#0f3f5d]";

function FormulaHelperDialog() {
  const [selectedCategory, setSelectedCategory] =
    useState<MetricFormulaCategoryKey>("solvency_analysis");
  const formulas = getMetricFormulasByCategory(selectedCategory);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={navButtonClassName}>
          <span>公式小幫手</span>
          <span className="flex items-center text-[#57A6D4] transition-colors">
            <FunctionsIcon sx={{ fontSize: 18 }} />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="h-[85vh] max-w-6xl overflow-hidden border-[#d6e8f4] bg-[#f8fcff] p-0">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-[#d6e8f4] bg-white px-8 py-6 text-left">
            <DialogTitle className="text-xl text-[#12344a]">
              公式小幫手
            </DialogTitle>
            <DialogDescription className="text-[#4c7187]">
              依分析主題快速查看常用授信與財務指標公式、用途與判讀重點。
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-rows-[auto,minmax(0,1fr)] gap-0 md:grid-cols-[240px,minmax(0,1fr)] md:grid-rows-1">
            <aside className="border-b border-[#d6e8f4] bg-[#f4fafe] p-4 md:min-h-0 md:border-b-0 md:border-r">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#5b88a3]">
                分析類別
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col">
                {METRIC_FORMULA_CATEGORIES.map((category) => {
                  const isSelected = category.key === selectedCategory;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setSelectedCategory(category.key)}
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-[#57A6D4] bg-[#57A6D4] text-white shadow-sm"
                          : "border-[#cfe4f2] bg-white text-[#12344a] hover:border-[#57A6D4] hover:bg-[#eef7fc]",
                      )}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-h-0 overflow-y-auto px-6 py-5 md:px-8">
              <div className="mb-5">
                <div className="text-lg font-semibold text-[#12344a]">
                  {getMetricFormulaCategoryLabel(selectedCategory)}
                </div>
                <div className="mt-1 text-sm text-[#5d7b90]">
                  共 {formulas.length} 項公式
                </div>
              </div>

              <div className="grid gap-4">
                {formulas.map((item) => (
                  <section
                    key={`${selectedCategory}-${item.metricName}`}
                    className="rounded-3xl border border-[#d6e8f4] bg-white p-5 shadow-[0_10px_30px_rgba(48,169,216,0.08)]"
                  >
                    <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                      <div className="text-base font-semibold text-[#12344a]">
                        {item.metricName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#5d7b90]">
                        <span>{item.metricNameEn}</span>
                        <span className="rounded-full border border-[#cfe4f2] bg-[#f5fbff] px-2 py-0.5 text-xs font-semibold text-[#2d689d]">
                          {item.metricAbbr}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#d9edf8] bg-[#f5fbff] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                        Formula
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-[#12344a]">
                        {item.formula}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-[#f8fbfd] px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                          分析用途
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[#234b63]">
                          {item.analysisPurpose}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#f8fbfd] px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                          判讀重點
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[#234b63]">
                          {item.keyInsight}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#d9edf8] bg-[#f7fbfe] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                        範例
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[#234b63]">
                        {item.example}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const isReportGeneratorSection = pathname.startsWith("/report-generator");
  const isChatbotSection =
    pathname.startsWith("/chatbot") ||
    pathname.startsWith("/expert-knowledge") ||
    pathname.startsWith("/external-knowledge");

  if (pathname === "/") return null;

  return (
    <nav>
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#d6e8f4] bg-[#f8fcff] p-1.5">
        {isChatbotSection ? (
          <>
            <ActiveLink
              href="/chatbot"
              icon={<Bot className="h-[18px] w-[18px]" />}
            >
              AI Chat Bot
            </ActiveLink>
            <ActiveLink
              href="/expert-knowledge"
              icon={<PsychologyAltIcon sx={{ fontSize: 18 }} />}
            >
              專家知識庫
            </ActiveLink>
            <ActiveLink
              href="/external-knowledge"
              icon={<Database className="h-[18px] w-[18px]" />}
            >
              資料倉儲
            </ActiveLink>
            <FormulaHelperDialog />
          </>
        ) : null}
        {isReportGeneratorSection ? (
          <ActiveLink
            href="/report-generator"
            icon={<FileText className="h-[18px] w-[18px]" />}
          >
            徵審報告產生器
          </ActiveLink>
        ) : null}
      </div>
    </nav>
  );
}
