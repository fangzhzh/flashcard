import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a flashcard assistant. Given flashcards with a front (topic/question) and back (answer), determine if each card should be split into sub-questions.

Split a card ONLY if its back contains 3+ clearly distinct items: numbered steps, bullet points, or markdown sections.
For simple one-answer cards, return the original unchanged.

Rules:
- Write questions in the same language as the original card (Chinese if Chinese)
- Each sub-question targets ONE specific item
- Sub-question front should reference the parent topic
- Return ONLY valid JSON, no explanation

Output format (JSON array, one entry per input card):
[
  {
    "id": "<original card id>",
    "subCards": [
      { "front": "question about one item", "back": "the specific item content" }
    ]
  }
]
If not splitting: subCards has one entry with the original front/back.`;

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
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
