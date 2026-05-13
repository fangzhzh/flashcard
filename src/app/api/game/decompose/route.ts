import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a learning assistant that converts study material into quiz questions.

You will receive items that are either:
1. Flashcards: front = question/topic, back = answer (possibly with multiple steps/methods)
2. Knowledge overviews: front = title, back = a structured knowledge note with sections

For each item, generate sub-questions that test understanding of each distinct point.

Rules:
- Generate 2-8 sub-questions depending on content richness
- Each sub-question targets ONE specific concept, method, or named item
- Write questions in the SAME language as the input (Chinese if Chinese)
- Sub-question front should be a COMPLETE QUESTION that names the specific thing being asked about

IMPORTANT - Never use ordinal numbers (要点1/要点2/step1/step2) in questions.
  Each bullet point in a list is a NAMED item, not a numbered step.
  Identify the name/label of each item and ask about it by name.

  Example card: front="方案: 简单｜复杂｜全面｜优雅｜临时", back="• A thorough solution... • Comprehensive solution... • Elegant solution..."
  BAD:  { "front": "「方案」的要点1是什么？", "back": "A thorough solution..." }
  GOOD: { "front": "「方案」中，什么是简单(Simple)方案？", "back": "A thorough solution: completeness, emphasize depth and details" }
  GOOD: { "front": "「方案」中，什么是优雅(Elegant)方案？", "back": "Elegant solution" }

  Example card: front="降低杏仁核激活的方法", back="• 正念冥想 • 腹式呼吸 • 认知重评"
  BAD:  { "front": "第2个方法是什么？", "back": "腹式呼吸" }
  GOOD: { "front": "「降低杏仁核激活」中，腹式呼吸如何帮助调节情绪？", "back": "腹式呼吸激活副交感神经，降低皮质醇水平，从而平息杏仁核的应激反应" }

CRITICAL: Sub-question back MUST contain the actual answer content, NOT just a section header.
  BAD  (wrong): { "front": "权衡是什么？", "back": "权衡 (Trade-offs):" }
  GOOD (right):  { "front": "权衡是什么？", "back": "延迟 vs 一致性：异步更新降低延迟但价格短暂不一致" }
  If the content under a header is missing or truncated in the input, skip that sub-card entirely.

- If the whole card is too simple (one short answer), return it unchanged as a single sub-card
- Return ONLY valid JSON, no explanation, no markdown fences

Output format (JSON array, one entry per input item):
[
  {
    "id": "<original id>",
    "subCards": [
      { "front": "specific named question", "back": "actual answer content" }
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
    const model = ai.getGenerativeModel({ model: 'gemini-3-flash' });

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
