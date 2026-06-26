import Link from "next/link";
import { ArrowRight, Bot, FileText } from "lucide-react";

const entryCards = [
  {
    title: "授信 AI 助理",
    description: "進入授信 AI 助理，針對公司財務、授信風險與資料倉儲內容進行多輪問答。",
    href: "/chatbot",
    icon: Bot,
    accentClassName: "bg-[#57A6D4] text-white",
  },
  {
    title: "徵審報告產生器",
    description: "進入報告產生流程，依輸入內容整理徵審分析與結構化報告草稿。",
    href: "/report-generator",
    icon: FileText,
    accentClassName: "bg-[#2F8F83] text-white",
  },
];

export default function Home() {
  return (
    <main className="h-full overflow-y-auto bg-[#f8fcff]">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center px-5 py-10 md:px-8">
        <section className="max-w-3xl">
          <div className="text-sm font-semibold text-[#2d689d]">AITC Credit Investigation</div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#12344a] md:text-5xl">
            徵審授信AI平台
          </h1>
          <p className="mt-4 text-base leading-7 text-[#4c7187] md:text-lg">
            點選進入授信AI助理進行授信風險問答，或使用徵審報告產生器建立分析報告草稿。
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {entryCards.map((entry) => {
            const Icon = entry.icon;

            return (
              <Link
                key={entry.href}
                href={entry.href}
                className="group rounded-lg border border-[#d6e8f4] bg-white p-6 shadow-[0_14px_40px_rgba(48,169,216,0.08)] transition-colors hover:border-[#57A6D4] hover:bg-[#f4fafe]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${entry.accentClassName}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[#57A6D4] transition-transform group-hover:translate-x-1" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-[#12344a]">{entry.title}</h2>
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#4c7187] md:text-base">
                  {entry.description}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
