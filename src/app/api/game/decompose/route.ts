import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a learning assistant that converts study material into quiz questions.

You will receive items that are either:
1. Flashcards: front = question/topic, back = answer (possibly with multiple steps/methods)
2. Knowledge overviews: front = title, back = a structured knowledge note with sections

For each item, generate sub-questions that test understanding of each distinct point.

Rules:
- Generate 2-8 sub-questions depending on content richness
- Each sub-question targets ONE specific concept, method, step, or insight
- Write questions in the SAME language as the input (Chinese if Chinese)
- Sub-question front should reference the parent topic naturally
  Example: "在「边界与自我价值」中，核心信念是什么？"
  Example: "「降低杏仁核激活」的第3个方法是什么？"
- Sub-question back should be the specific answer text (not the full content)
- If content is too simple (one short answer), return it unchanged as a single sub-card
- Return ONLY valid JSON, no explanation, no markdown fences

Output format (JSON array, one entry per input item):
[
  {
    "id": "<original id>",
    "subCards": [
      { "front": "specific question", "back": "specific answer" }
    ]
  }
]`;

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { cards } = await request.json() as {
      cards: { id: string; front: string; back: string }[]
    };
    if (!cards?.length) return NextResponse.json({ results: [] });

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const cardList = cards
      .map(c => `ID: ${c.id}\nFront: ${c.front}\nBack: ${c.back}`)
      .join('\n\n---\n\n');

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `Cards to process:\n\n${cardList}`,
    ]);

    const text = result.response.text().trim();
    // Strip markdown code fences if Gemini wraps in ```json
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(clean) as { id: string; subCards: { front: string; back: string }[] }[];

    return NextResponse.json({ results: parsed });
  } catch (err) {
    console.error('[decompose]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
