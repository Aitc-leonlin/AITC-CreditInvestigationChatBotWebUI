import { cn } from "@/utils/cn";
import {
  EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
  type ExpertKnowledgeEntry,
} from "@/data/expertKnowledge";
import type { Message } from "ai/react";
import { useState } from "react";
import { Button } from "./ui/button";
import { ChevronDown, Copy } from "lucide-react";

function renderBoldMarkdown(content: string) {
  const parts = [];
  let currentIndex = 0;
  let partIndex = 0;

  while (currentIndex < content.length) {
    const startIndex = content.indexOf("**", currentIndex);

    if (startIndex === -1) {
      parts.push(content.slice(currentIndex));
      break;
    }

    const endIndex = content.indexOf("**", startIndex + 2);

    if (endIndex === -1) {
      parts.push(content.slice(currentIndex));
      break;
    }

    if (startIndex > currentIndex) {
      parts.push(content.slice(currentIndex, startIndex));
    }

    const boldText = content.slice(startIndex + 2, endIndex);

    if (boldText.length === 0) {
      parts.push("**");
      currentIndex = startIndex + 2;
      continue;
    }

    parts.push(<strong key={`bold-${partIndex}`}>{boldText}</strong>);
    partIndex += 1;
    currentIndex = endIndex + 2;
  }

  return parts;
}

export function ChatMessageBubble(props: {
  message: Message;
  aiEmoji?: string;
  dataSources: any[];
  appliedExpertKnowledge?: ExpertKnowledgeEntry[];
  onCopy?: (message: Message) => void;
}) {
  const isThinking =
    props.message.role === "assistant" &&
    props.message.content.trim().length === 0;
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [isExpertKnowledgeOpen, setIsExpertKnowledgeOpen] = useState(false);
  const hasDataSources = !isThinking && props.dataSources && props.dataSources.length > 0;
  const hasAppliedExpertKnowledge =
    !isThinking &&
    props.appliedExpertKnowledge &&
    props.appliedExpertKnowledge.length > 0;

  return (
    <div
      className={cn(
        "mb-8 flex max-w-[80%] flex-col",
        props.message.role === "user" ? "ml-auto items-end" : "mr-auto items-start",
      )}
    >
      <div
        className={cn(
          "flex rounded-[24px]",
          props.message.role === "user"
            ? "bg-secondary px-4 py-2 text-secondary-foreground"
            : null,
        )}
      >
        {props.message.role !== "user" && (
          <div className="mr-4 border bg-secondary -mt-2 rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center">
            {props.aiEmoji}
          </div>
        )}

        <div className="whitespace-pre-wrap flex flex-col">
          {isThinking ? (
            <div
              className="flex min-h-8 items-center gap-2 text-muted-foreground"
              aria-label="AI 思考中"
            >
              <span className="loading-dot" />
              <span className="loading-dot [animation-delay:0.2s]" />
              <span className="loading-dot [animation-delay:0.4s]" />
            </div>
          ) : (
            <span>{renderBoldMarkdown(props.message.content)}</span>
          )}

        </div>
      </div>

      {!isThinking ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "mt-2 h-8 w-8 rounded-full text-muted-foreground",
            props.message.role !== "user" ? "ml-14" : null,
          )}
          onClick={() => props.onCopy?.(props.message)}
          aria-label="複製訊息"
          title="複製"
        >
          <Copy className="h-4 w-4" />
        </Button>
      ) : null}

      {hasDataSources ? (
        <div className="mt-2 w-full rounded-2xl border border-border bg-muted/40 px-3 py-2">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left text-sm"
            onClick={() => setIsDataSourcesOpen((current) => !current)}
          >
            <span className="font-medium">數據來源標註</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isDataSourcesOpen ? "rotate-180" : null,
              )}
            />
          </button>

          {isDataSourcesOpen ? (
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              {props.dataSources.map((source, index) => (
                <div
                  key={`data-source-${index}`}
                  className="rounded-xl border border-border bg-background/80 px-3 py-2"
                >
                  <div className="font-medium text-foreground">
                    {index + 1}. {source.title ?? source.name ?? source.label ?? "資料來源"}
                  </div>
                  {source.content ?? source.pageContent ? (
                    <div className="mt-1">
                      {source.content ?? source.pageContent}
                    </div>
                  ) : null}
                  {source.reference ?? source.period ?? source.path ? (
                    <div className="mt-1">
                      {source.reference ?? source.period ?? source.path}
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDataSourcesOpen(false)}
                >
                  縮小
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasAppliedExpertKnowledge ? (
        <div className="mt-2 w-full rounded-2xl border border-border bg-muted/40 px-3 py-2">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left text-sm"
            onClick={() => setIsExpertKnowledgeOpen((current) => !current)}
          >
            <span className="font-medium">已套用專業分析設定</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpertKnowledgeOpen ? "rotate-180" : null,
              )}
            />
          </button>

          {isExpertKnowledgeOpen ? (
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              {props.appliedExpertKnowledge?.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border bg-background/80 px-3 py-2"
                >
                  <div className="font-medium text-foreground">
                    {index + 1}. {entry.title || "未命名專業分析設定"}
                  </div>
                  <div className="mt-1">產業：{entry.industry}</div>
                  <div className="mt-1">
                    公司：
                    {entry.companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE
                      ? "不指定特定公司"
                      : entry.companyPromptValue || entry.companyLabel}
                  </div>
                  {entry.description ? (
                    <div className="mt-1">錨定點：{entry.description}</div>
                  ) : null}
                  {entry.systemPrompt ? (
                    <div className="mt-1 whitespace-pre-wrap">
                      專業分析指引：{entry.systemPrompt}
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpertKnowledgeOpen(false)}
                >
                  縮小
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
