import { NextResponse } from "next/server";
import { callOpenAI } from "@/lib/openai";
import { formatReferenceContext, summaryPrompt } from "@/lib/prompts";

export async function POST(request) {
  try {
    const payload = await request.json();
    const referenceContext = formatReferenceContext(payload.pdfSource, payload.matchedProblems);
    const text = await callOpenAI([
      {
        role: "user",
        content: [{ type: "input_text", text: summaryPrompt({ ...payload, referenceContext }) }]
      }
    ]);

    return NextResponse.json({ text, referenceContext });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
