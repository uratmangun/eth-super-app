import os from "node:os";
import path from "node:path";
import { writeFile } from "node:fs/promises";

import { tool } from "ai";
import { z } from "zod";

function extractTitle(content: string) {
  const match = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function decodeHtmlEntities(content: string) {
  return content
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function createTextPreview(content: string, contentType: string, maxLength = 2000) {
  const isHtml = contentType.includes("html");
  const text = decodeHtmlEntities(
    (isHtml
      ? content
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
      : content
    )
      .replace(/\s+/g, " ")
      .trim(),
  );

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function inferContentFormat(contentType: string, finalUrl: string) {
  const pathname = new URL(finalUrl).pathname.toLowerCase();

  if (contentType.includes("markdown") || pathname.endsWith(".md") || pathname.endsWith(".mdx")) {
    return "markdown";
  }

  if (contentType.includes("html") || pathname.endsWith(".html") || pathname.endsWith(".htm")) {
    return "html";
  }

  return "text";
}

function inferExtension(contentFormat: "html" | "markdown" | "text") {
  if (contentFormat === "markdown") {
    return "md";
  }

  if (contentFormat === "html") {
    return "html";
  }

  return "txt";
}

export const webFetchTool = tool({
  description:
    "Fetch a URL directly. Prefer Markdown when the server supports it; otherwise return HTML or text plus a preview for source-backed documentation lookups.",
  inputSchema: z.object({
    url: z.string().url().describe("Fully formed URL to fetch"),
  }),
  execute: async ({ url }) => {
    const response = await fetch(url, {
      headers: {
        Accept: "text/markdown, text/x-markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.5",
        "User-Agent": "eth-super-app-web-fetch/1.0",
      },
      redirect: "follow",
    });
    const content = await response.text();

    if (!response.ok) {
      throw new Error(`web-fetch request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const contentFormat = inferContentFormat(contentType, response.url);
    const outputPath = path.join(
      os.tmpdir(),
      `ai-sdk-web-fetch-${Date.now()}-${Math.random().toString(36).slice(2)}.${inferExtension(contentFormat)}`,
    );

    await writeFile(outputPath, content, "utf8");

    return {
      content,
      contentFormat,
      contentLength: content.length,
      contentType,
      finalUrl: response.url,
      html: contentFormat === "html" ? content : undefined,
      htmlLength: contentFormat === "html" ? content.length : undefined,
      markdown: contentFormat === "markdown" ? content : undefined,
      markdownLength: contentFormat === "markdown" ? content.length : undefined,
      outputPath,
      requestedUrl: url,
      textPreview: createTextPreview(content, contentType),
      title: contentFormat === "html" ? extractTitle(content) : "",
    };
  },
});
