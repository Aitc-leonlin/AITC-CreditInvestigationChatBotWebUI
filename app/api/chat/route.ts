import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import { buildApiUrl } from "@/utils/api";

export const runtime = "nodejs";
export const maxDuration = 180;

const EXTERNAL_CHAT_API_BASE_URL = process.env.CHATBOT_API_BASE_URL;
const EXTERNAL_CHAT_API_MODE = process.env.CHATBOT_API_MODE ?? "post_json";
const EXTERNAL_CHAT_API_CHAT_PATH =
  process.env.CHATBOT_API_CHAT_PATH ??
  "/chat";
const EXTERNAL_CHAT_API_TIMEOUT_MS = Number(
  process.env.CHATBOT_API_TIMEOUT_MS ?? "180000",
);
const DATA_SOURCES_HEADER = "x-data-sources";

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `你是 AITC 的授信調查分析助理。請依照使用者問題提供條理清楚、專業且精簡的繁體中文分析。
若使用者是延續追問，例如「那跟同業比呢？」、「再細一點」或「上一題的風險在哪？」，
必須根據完整對話上下文延續回答，不可當成全新問題。
若資訊不足，請明確說明需要哪些補充資料，避免臆測。
{system_prompt_block}

Current conversation:
{chat_history}

User: {input}
AI:`;

function buildExternalApiUrl(baseUrl: string, path: string) {
  return buildApiUrl(path, baseUrl);
}

function getPeriodLabel(settings: any) {
  if (!settings?.period) return "";

  if (settings.period === "年度") {
    return settings.periodYear ? `${settings.periodYear}年度` : "年度";
  }

  if (settings.period === "季度") {
    if (settings.periodYear && settings.periodQuarter) {
      return `${settings.periodYear}年${settings.periodQuarter}`;
    }
    return "季度";
  }

  return settings.period;
}

async function proxyToBackend(body: any) {
  if (!EXTERNAL_CHAT_API_BASE_URL) return null;

  const messages = body.messages ?? [];
  const currentMessageContent =
    messages[messages.length - 1]?.content?.toString() ?? "";
  const settings = body.settings ?? {};
  const backendPayload = {
    question: currentMessageContent,
    company: settings.company ?? "",
    period: getPeriodLabel(settings),
    settings,
    customSystemPrompt: body.customSystemPrompt ?? "",
    expertKnowledge: body.expertKnowledge ?? null,
    conversationId: body.conversationId ?? "",
    messages,
  };

  console.log("POST /chatbot backendPayload:", JSON.stringify(backendPayload, null, 2));

  const response = await fetch(
    buildExternalApiUrl(
      EXTERNAL_CHAT_API_BASE_URL,
      EXTERNAL_CHAT_API_CHAT_PATH,
    ),
    {
      signal: AbortSignal.timeout(EXTERNAL_CHAT_API_TIMEOUT_MS),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(backendPayload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "後端聊天服務回應失敗");
  }

  const json = await response.json().catch(() => null);
  const answer =
    typeof json?.answer === "string"
      ? json.answer
      : typeof json?.message === "string"
        ? json.message
        : JSON.stringify(json);
  const dataSources = Array.isArray(json?.data_sources)
    ? json.data_sources
    : [];

  return new Response(answer, {
    status: response.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...(dataSources.length
        ? {
            [DATA_SOURCES_HEADER]: Buffer.from(
              JSON.stringify(dataSources),
            ).toString("base64"),
          }
        : {}),
    },
  });
}

/**
 * This handler initializes and calls a simple chain with a prompt,
 * chat model, and output parser. See the docs for more information:
 *
 * https://js.langchain.com/docs/guides/expression_language/cookbook#prompttemplate--llm--outputparser
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const proxiedResponse = await proxyToBackend(body);
    if (proxiedResponse) {
      return proxiedResponse;
    }

    const messages = body.messages ?? [];
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    const currentMessageContent = messages[messages.length - 1].content;
    const prompt = PromptTemplate.fromTemplate(TEMPLATE);
    const systemPromptBlock = body.customSystemPrompt
      ? `\n專家知識庫補充指示：\n${body.customSystemPrompt}\n`
      : "";

    /**
     * You can also try e.g.:
     *
     * import { ChatAnthropic } from "@langchain/anthropic";
     * const model = new ChatAnthropic({});
     *
     * See a full list of supported models at:
     * https://js.langchain.com/docs/modules/model_io/models/
     */
    const model = new ChatOpenAI({
      temperature: 0.8,
      model: "gpt-4o-mini",
    });

    /**
     * Chat models stream message chunks rather than bytes, so this
     * output parser handles serialization and byte-encoding.
     */
    const outputParser = new HttpResponseOutputParser();

    /**
     * Can also initialize as:
     *
     * import { RunnableSequence } from "@langchain/core/runnables";
     * const chain = RunnableSequence.from([prompt, model, outputParser]);
     */
    const chain = prompt.pipe(model).pipe(outputParser);

    const stream = await chain.stream({
      chat_history: formattedPreviousMessages.join("\n"),
      input: currentMessageContent,
      system_prompt_block: systemPromptBlock,
    });

    /**
     * Backend integration contract for data source annotation:
     * External backend POST JSON contract:
     * request:
     * {
     *   question: string,
     *   company: string,
     *   period: string,
     *   settings: {...},
     *   conversationId: string,
     *   messages: [...]
     * }
     *
     * response:
     * {
     *   answer: string,
     *   data_sources: [...]
     * }
     */
    return new StreamingTextResponse(stream);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
