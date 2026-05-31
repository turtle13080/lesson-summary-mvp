import { NextResponse } from "next/server";
import { callOpenAI, parseJsonish } from "@/lib/openai";
import { pdfIndexPrompt } from "@/lib/prompts";

export const maxDuration = 60;

function toDataUrl(buffer, contentType = "application/pdf") {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request) {
  try {
    const { name, signedUrl } = await request.json();
    if (!name || !signedUrl) {
      return NextResponse.json({ error: "PDF 파일 주소가 필요합니다." }, { status: 400 });
    }

    const pdfResponse = await fetch(signedUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: "Supabase Storage에서 PDF를 읽지 못했습니다." }, { status: 400 });
    }

    const contentLength = Number(pdfResponse.headers.get("content-length") || 0);
    if (contentLength > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF가 너무 큽니다. 우선 25MB 이하 PDF 또는 필요한 페이지만 잘라 업로드해 주세요." },
        { status: 413 }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const dataUrl = toDataUrl(pdfBuffer, pdfResponse.headers.get("content-type") || "application/pdf");

    const text = await callOpenAI([
      {
        role: "user",
        content: [
          { type: "input_text", text: pdfIndexPrompt(name) },
          { type: "input_file", filename: name, file_data: dataUrl }
        ]
      }
    ]);
    const index = parseJsonish(text, { title: name, problems: [], raw: text });

    return NextResponse.json({
      title: index.title || name,
      problems: Array.isArray(index.problems) ? index.problems : [],
      raw: index.raw
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
