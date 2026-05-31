import { NextResponse } from "next/server";
import { callOpenAI, parseJsonish } from "@/lib/openai";
import { pdfIndexPrompt } from "@/lib/prompts";

export async function POST(request) {
  try {
    const { name, dataUrl } = await request.json();
    if (!name || !dataUrl) {
      return NextResponse.json({ error: "PDF 파일이 필요합니다." }, { status: 400 });
    }

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
