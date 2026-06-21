import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const JUDGE_PROMPT = `You are a FAANG-level Senior Software Engineer and Code Interviewer. Review the submitted solution for the given LeetCode problem.

Evaluate:
1. **Correctness**: Does the solution correctly handle all cases including edge cases?
2. **Time Complexity**: Analyze Big-O time complexity.
3. **Space Complexity**: Analyze Big-O space complexity.
4. **Code Quality**: Is it clean, readable, and idiomatic?
5. **Interview Performance**: How would this perform in a real FAANG interview?

Rules:
- Be specific about line-level issues when found.
- Score from 0-100 where: <60 needs work, 60-79 acceptable, 80-89 good, 90+ excellent.
- Suggest concrete improvements with code snippets when helpful.
- Respond in the same language as the problem description hint (Chinese if hint is Chinese, otherwise English).
- Return ONLY valid JSON. No markdown fences.`;

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { problemNum, problemTitle, code, language } = await request.json();

    if (!code || !problemNum) {
      return NextResponse.json({ error: 'Missing code or problem info' }, { status: 400 });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Problem: ${problemNum}. ${problemTitle}
Language: ${language || 'Java'}

Code:
\`\`\`${language?.toLowerCase() || 'java'}
${code}
\`\`\``;

    const responseSchema = {
      type: 'OBJECT' as const,
      properties: {
        score: { type: 'INTEGER' as const, description: 'Overall score 0-100' },
        passed: { type: 'BOOLEAN' as const, description: 'Would this pass a FAANG interview?' },
        timeComplexity: { type: 'STRING' as const, description: 'Time complexity e.g. O(n log n)' },
        spaceComplexity: { type: 'STRING' as const, description: 'Space complexity e.g. O(n)' },
        summary: { type: 'STRING' as const, description: 'Markdown formatted overall review' },
        issues: {
          type: 'ARRAY' as const,
          items: {
            type: 'OBJECT' as const,
            properties: {
              severity: { type: 'STRING' as const, enum: ['HIGH', 'MEDIUM', 'LOW'] },
              description: { type: 'STRING' as const },
              suggestion: { type: 'STRING' as const },
            },
            required: ['severity', 'description', 'suggestion'],
          },
        },
        optimizations: {
          type: 'ARRAY' as const,
          items: { type: 'STRING' as const },
        },
        suggestedApproach: { type: 'STRING' as const, description: 'If the approach is suboptimal, describe a better one' },
      },
      required: ['score', 'passed', 'timeComplexity', 'spaceComplexity', 'summary', 'issues', 'optimizations'],
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${JUDGE_PROMPT}\n\nInput:\n${prompt}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any,
      },
    });

    const text = result.response.text().trim();
    const review = JSON.parse(text);
    return NextResponse.json(review);
  } catch (error: any) {
    console.error('[leetcode-judge-failed]', error);
    return NextResponse.json({ error: `AI review failed: ${error.message}` }, { status: 500 });
  }
}
