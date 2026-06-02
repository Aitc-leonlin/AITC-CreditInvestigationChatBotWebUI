import { NextRequest, NextResponse } from "next/server";

import { buildApiUrl } from "@/utils/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTERNAL_NEGATIVE_NEWS_BASE_URL = process.env.CHATBOT_API_BASE_URL;
const EXTERNAL_NEGATIVE_NEWS_PATH =
  process.env.CHATBOT_API_NEGATIVE_NEWS_PATH ?? "/negative-news";
const EXTERNAL_NEGATIVE_NEWS_TIMEOUT_MS = Number(
  process.env.CHATBOT_API_NEGATIVE_NEWS_TIMEOUT_MS ?? "60000",
);

type RawNewsItem = Record<string, unknown>;

function normalizeNewsItem(item: RawNewsItem, index: number) {
  return {
    id:
      typeof item.id === "string"
        ? item.id
        : typeof item.news_id === "string"
          ? item.news_id
          : `news-${index}`,
    title:
      typeof item.title === "string"
        ? item.title
        : typeof item.headline === "string"
          ? item.headline
          : "",
    summary:
      typeof item.summary === "string"
        ? item.summary
        : typeof item.description === "string"
          ? item.description
          : typeof item.content === "string"
            ? item.content
            : "",
    source:
      typeof item.source === "string"
        ? item.source
        : typeof item.sourceName === "string"
          ? item.sourceName
          : typeof item.media === "string"
            ? item.media
            : "",
    url:
      typeof item.url === "string"
        ? item.url
        : typeof item.link === "string"
          ? item.link
          : "",
    publishedAt:
      typeof item.publishedAt === "string"
        ? item.publishedAt
        : typeof item.published_at === "string"
          ? item.published_at
          : typeof item.date === "string"
            ? item.date
            : "",
    company:
      typeof item.company === "string"
        ? item.company
        : typeof item.companyName === "string"
          ? item.companyName
          : "",
    sentiment:
      typeof item.sentiment === "string"
        ? item.sentiment
        : typeof item.category === "string"
          ? item.category
          : typeof item.tone === "string"
            ? item.tone
            : "negative",
  };
}

export async function GET(request: NextRequest) {
  if (!EXTERNAL_NEGATIVE_NEWS_BASE_URL) {
    return NextResponse.json(
      { error: "尚未設定負面消息後端服務位置" },
      { status: 503 },
    );
  }

  try {
    const upstreamUrl = new URL(
      buildApiUrl(
        EXTERNAL_NEGATIVE_NEWS_PATH,
        EXTERNAL_NEGATIVE_NEWS_BASE_URL,
      ),
    );

    request.nextUrl.searchParams.forEach((value, key) => {
      if (value) {
        upstreamUrl.searchParams.set(key, value);
      }
    });

    const response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(EXTERNAL_NEGATIVE_NEWS_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "負面消息服務回應失敗");
    }

    const json = await response.json().catch(() => null);
    const rawItems: unknown[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data)
          ? json.data
          : [];

    const items = rawItems
      .filter(
        (item: unknown): item is RawNewsItem =>
          Boolean(item) && typeof item === "object",
      )
      .map((item: RawNewsItem, index: number) => normalizeNewsItem(item, index));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "負面消息服務發生未知錯誤",
      },
      { status: 500 },
    );
  }
}
