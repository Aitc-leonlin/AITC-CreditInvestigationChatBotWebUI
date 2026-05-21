import { NextRequest, NextResponse } from "next/server";

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt 為必填欄位" },
        { status: 400 },
      );
    }

    const model = new ChatOpenAI({
      temperature: 0.7,
      model: "gpt-4o-mini",
    });

    const response = await model.invoke([
      new SystemMessage(
        "你是企業授信調查與風險分析專家。請根據使用者提供的提示，產出一段可直接貼入系統提示詞欄位的繁體中文專家指引。請直接輸出內容本身，不要加前言、標題、引號或解釋。",
      ),
      new HumanMessage(prompt),
    ]);

    const content =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content)
          ? response.content
              .map((item) =>
                typeof item === "string"
                  ? item
                  : "text" in item && typeof item.text === "string"
                    ? item.text
                    : "",
              )
              .join("")
              .trim()
          : "";

    if (!content) {
      return NextResponse.json(
        { error: "AI 沒有回傳可用內容" },
        { status: 502 },
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI 產生時發生未知錯誤",
      },
      { status: 500 },
    );
  }
}
