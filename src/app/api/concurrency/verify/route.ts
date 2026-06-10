import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { CHALLENGES } from '@/lib/concurrency-challenges';

const CONCURRENCY_AUDITOR_PROMPT = `You are a Senior JVM Concurrency Expert and Code Auditor. Your task is to review the user's submitted Java concurrency code for a specific challenge level.

You must evaluate the code based on:
1. Correctness: Does it solve the specified requirements?
2. Concurrency Safety: Check for race conditions, thread-safety, memory visibility (happens-before, volatile), deadlocks (lock ordering), livelocks, and starvation.
3. Performance & Contention: Is it optimized? Check for lock contention, wake-up storms (notifyAll vs signal), and busy spinning.
4. JMM Semantics: Verify correct usage of synchronized, ReentrantLock, volatile, CAS (compareAndSet), atomic primitives, and thread-safe collections.

Rules for evaluation:
- The result must be marked as "passed": true only if there are NO 'HIGH' severity concurrency bugs (e.g. data races, visibility bugs, deadlock risks, or failing to meet core requirements).
- Provide detailed feedback in 'summary' using Markdown. Explain their locks, potential problems, and praise correct implementations.
- List all found bugs in 'bugs'. Each bug must specify the severity, the exact line/snippet context, and a clear explanation of how to fix it.
- Suggest optimization tips in 'optimizations'.

You must respond in the same language as the challenge description (Chinese if the prompt/description is Chinese).
Return ONLY valid JSON matching the schema. No markdown fences, no explanations outside the JSON.`;

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { challengeId, levelId, code } = await request.json();

    if (!challengeId || !levelId || !code) {
      return NextResponse.json({ error: 'Missing challengeId, levelId, or code' }, { status: 400 });
    }

    const challenge = CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge) {
      return NextResponse.json({ error: `Challenge ${challengeId} not found` }, { status: 404 });
    }

    const level = challenge.levels.find((l) => l.id === levelId);
    if (!level) {
      return NextResponse.json({ error: `Level ${levelId} not found` }, { status: 404 });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Challenge ID: ${challengeId} (${challenge.title})
Level ID: ${levelId} (${level.title})
Concepts to master: ${level.concepts.join(', ')}
Requirements:
${level.requirements}

User Code:
\`\`\`java
${code}
\`\`\``;

    const responseSchema = {
      type: 'OBJECT' as const,
      properties: {
        passed: { type: 'BOOLEAN' as const, description: 'True if code is correct and free of HIGH severity concurrency bugs.' },
        score: { type: 'INTEGER' as const, description: 'Overall code quality score from 0 to 100.' },
        bugs: {
          type: 'ARRAY' as const,
          items: {
            type: 'OBJECT' as const,
            properties: {
              description: { type: 'STRING' as const, description: 'Brief description of the concurrency bug.' },
              lineSnippet: { type: 'STRING' as const, description: 'The code line or snippet containing the bug.' },
              severity: { type: 'STRING' as const, enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'How critical the bug is.' },
              fixSuggestion: { type: 'STRING' as const, description: 'Instructions on how to resolve the issue.' }
            },
            required: ['description', 'lineSnippet', 'severity', 'fixSuggestion']
          }
        },
        summary: { type: 'STRING' as const, description: 'Markdown-formatted code review summary.' },
        optimizations: {
          type: 'ARRAY' as const,
          items: { type: 'STRING' as const },
          description: 'List of concurrency performance optimization suggestions.'
        }
      },
      required: ['passed', 'score', 'bugs', 'summary', 'optimizations']
    };

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${CONCURRENCY_AUDITOR_PROMPT}\n\nInput:\n${prompt}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any
      }
    });

    const text = result.response.text().trim();
    const reviewResult = JSON.parse(text);

    return NextResponse.json(reviewResult);
  } catch (error: any) {
    console.error('[concurrency-verification-failed]', error);
    return NextResponse.json({ error: `AI Code review failed: ${error.message}` }, { status: 500 });
  }
}
