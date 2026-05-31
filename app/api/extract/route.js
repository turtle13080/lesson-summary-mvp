import { NextResponse } from "next/server";
import { callOpenAI } from "@/lib/openai";
import { extractionPrompt } from "@/lib/prompts";

function buildImageParts(images) {
  return images.map((image) => ({
    type: "input_image",
    image_url: image.dataUrl
  }));
}

export async function POST(request) {
  try {
    const { images = [] } = await request.json();
    if (!images.length) {
      return NextResponse.json({ error: "이미지를 1장 이상 업로드하거나 붙여넣어 주세요." }, { status: 400 });
    }

    const text = await callOpenAI([
      {
        role: "user",
        content: [{ type: "input_text", text: extractionPrompt() }, ...buildImageParts(images)]
      }
    ]);

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
