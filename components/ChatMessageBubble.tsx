import { cn } from "@/utils/cn";
import type { Message } from "ai/react";
import { useState } from "react";
import { Button } from "./ui/button";
import { ChevronDown, Copy } from "lucide-react";

export type UsedExpertKnowledge = {
  title?: string;
  anchorDescription?: string;
  systemPrompt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ExternalReferenceData = {
  source?: string;
  response?: string;
};

function parseContextualUserMessage(content: string) {
  const [firstLine, ...restLines] = content.split("\n");
  const questionBody = restLines.join("\n").trim();

  if (
    !firstLine?.startsWith("根據") ||
    !firstLine.endsWith("的資訊") ||
    !questionBody
  ) {
    return null;
  }

  return {
    contextLine: firstLine.trim(),
    questionBody,
  };
}

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

function getSourceTitle(source: any) {
  return (
    source.title ??
    source.name ??
    source.label ??
    source.source ??
    source.sourceName ??
    source.url ??
    "資料來源"
  );
}

function getSourceContent(source: any) {
  return (
    source.content ??
    source.pageContent ??
    source.summary ??
    source.snippet ??
    source.description ??
    source.text ??
    ""
  );
}

function getSourceReference(source: any) {
  return (
    source.reference ??
    source.period ??
    source.path ??
    source.url ??
    source.source ??
    ""
  );
}

function SourceMeta(props: { label: string; value: unknown }) {
  if (typeof props.value !== "string" || !props.value.trim()) return null;

  return (
    <div className="mt-1 break-words">
      <span className="font-medium">{props.label}：</span>
      {props.value}
    </div>
  );
}

export function ChatMessageBubble(props: {
  message: Message;
  aiEmoji?: string;
  dataSources: any[];
  appliedExpertKnowledge?: UsedExpertKnowledge[];
  appliedExternalData?: ExternalReferenceData[];
  onCopy?: (message: Message) => void;
}) {
  const isThinking =
    props.message.role === "assistant" &&
    props.message.content.trim().length === 0;
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [isExpertKnowledgeOpen, setIsExpertKnowledgeOpen] = useState(false);
  const [isExternalDataOpen, setIsExternalDataOpen] = useState(false);
  const hasDataSources = !isThinking && props.dataSources && props.dataSources.length > 0;
  const hasAppliedExpertKnowledge =
    !isThinking &&
    props.appliedExpertKnowledge &&
    props.appliedExpertKnowledge.length > 0;
  const hasExternalData =
    !isThinking &&
    props.appliedExternalData &&
    props.appliedExternalData.length > 0;
  const contextualUserMessage =
    props.message.role === "user"
      ? parseContextualUserMessage(props.message.content)
      : null;

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
          ) : contextualUserMessage ? (
            <div className="flex flex-col gap-2">
              <div>{renderBoldMarkdown(contextualUserMessage.contextLine)}</div>
              <div>{renderBoldMarkdown(contextualUserMessage.questionBody)}</div>
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
        <div className="mt-2 w-full rounded-2xl border border-sky-300 bg-sky-100 px-3 py-2 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left text-sm"
            onClick={() => setIsDataSourcesOpen((current) => !current)}
          >
            <span className="font-medium">數據來源標註</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isDataSourcesOpen ? "rotate-180" : null,
              )}
            />
          </button>

          {isDataSourcesOpen ? (
            <div className="mt-3 space-y-2 break-words text-xs">
              {props.dataSources.map((source, index) => (
                <div
                  key={`data-source-${index}`}
                  className="rounded-xl border border-sky-200 bg-white/80 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/50"
                >
                  <div className="font-medium">
                    {index + 1}. {getSourceTitle(source)}
                  </div>
                  <SourceMeta label="來源" value={source.source ?? source.sourceName} />
                  <SourceMeta label="摘要" value={getSourceContent(source)} />
                  <SourceMeta label="參照" value={getSourceReference(source)} />
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
        <div className="mt-2 w-full rounded-2xl border border-emerald-300 bg-emerald-100 px-3 py-2 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left text-sm"
            onClick={() => setIsExpertKnowledgeOpen((current) => !current)}
          >
            <span className="font-medium">已套用專業分析設定</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpertKnowledgeOpen ? "rotate-180" : null,
              )}
            />
          </button>

          {isExpertKnowledgeOpen ? (
            <div className="mt-3 space-y-2 text-xs">
              {props.appliedExpertKnowledge?.map((entry, index) => (
                <div
                  key={`${entry.title ?? "expert-knowledge"}-${index}`}
                  className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/50"
                >
                  <div className="font-medium">
                    {index + 1}. {entry.title || "未命名專業分析設定"}
                  </div>
                  {entry.systemPrompt ? (
                    <div className="mt-1 whitespace-pre-wrap">
                      專家指引：{entry.systemPrompt}
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

      {hasExternalData ? (
        <div className="mt-2 w-full rounded-2xl border border-violet-300 bg-violet-100 px-3 py-2 text-violet-950 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left text-sm"
            onClick={() => setIsExternalDataOpen((current) => !current)}
          >
            <span className="font-medium">外部參考資料</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExternalDataOpen ? "rotate-180" : null,
              )}
            />
          </button>

          {isExternalDataOpen ? (
            <div className="mt-3 space-y-2 break-words text-xs">
              {props.appliedExternalData?.map((entry, index) => (
                <div
                  key={`${entry.source ?? "external-data"}-${index}`}
                  className="rounded-xl border border-violet-200 bg-white/80 px-3 py-2 break-words dark:border-violet-900 dark:bg-violet-950/50"
                >
                  <div className="break-words font-medium">
                    {index + 1}. {entry.source || "AI Agent 外部資料查詢"}
                  </div>
                  <SourceMeta label="來源" value={entry.source} />
                  <SourceMeta label="回傳內容" value={entry.response} />
                </div>
              ))}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExternalDataOpen(false)}
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
