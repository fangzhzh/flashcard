import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a FAANG-level Senior Software Engineer and System Design Interviewer.
You are conducting a professional mock interview for the following system design question.

System Design Interview Stages:
1. CLARIFICATION: Clarify functional and non-functional requirements, constraints, and scope.
2. ESTIMATION: Capacity estimation (traffic QPS, database storage size, bandwidth, cache size).
3. API_DESIGN: Define the system APIs (REST or RPC contracts) and the database schema.
4. ARCHITECTURE: Draw/explain high-level block diagram architecture and core workflows.
5. DEEP_DIVE: Address scaling bottlenecks, consistent hashing, replication, failover, CAP trade-offs, and edge cases.
6. COMPLETED: The interview is concluded.

Your Interviewing Rules:
- Act as a real interviewer. Be conversational, analytical, and demanding but constructive.
- Guide the user through the stages in order. Do not skip stages.
- Ask follow-up questions to test their knowledge or challenge their design trade-offs (e.g. "What happens if a DB node fails?").
- When they have sufficiently covered the current stage (or explicitly say "let's move to the next stage"), change the 'stage' in the JSON output to the next one.
- If they are in the DEEP_DIVE stage and you feel the interview is complete, change the stage to 'COMPLETED' and populate the scorecard object.

Response Format:
You MUST respond ONLY with a valid JSON object. Do not wrap in markdown fences or include any conversational filler outside the JSON.

JSON Schema:
{
  "nextQuestion": "Your direct reply/question to the candidate in the role of the interviewer.",
  "stage": "CLARIFICATION" | "ESTIMATION" | "API_DESIGN" | "ARCHITECTURE" | "DEEP_DIVE" | "COMPLETED",
  "feedback": "Optional markdown string giving helpful design tips or brief feedback (mainly populate during stage transitions or at the end).",
  "scorecard": {
    "score": 88, // Overall score (0-100)
    "breakdown": {
      "requirements": 90, // Requirements clarification score (0-100)
      "estimation": 80, // Capacity estimation score (0-100)
      "apis": 85, // API & data schema score (0-100)
      "components": 90, // Component design score (0-100)
      "scaling": 90 // Scaling & tradeoffs score (0-100)
    },
    "summary": "Markdown formatted summary report of their performance, highlighting strengths and weaknesses."
  }
}`;

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { problemTitle, messages, currentStage } = await request.json();

    if (!problemTitle || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing problemTitle or messages array' }, { status: 400 });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const chatHistoryPrompt = messages.map((m: any) => {
      const roleName = m.role === 'user' ? 'Candidate' : 'Interviewer';
      return `${roleName}: ${m.content}`;
    }).join('\n\n');

    const prompt = `System Design Topic: ${problemTitle}
Current Interview Stage: ${currentStage}

Interview Chat History so far:
${chatHistoryPrompt}

Given the chat history, please evaluate the candidate's last response, decide whether to progress to the next interview stage, and output the next question or concluded scorecard in JSON format following the system prompt rules.`;

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: prompt }
    ]);

    const rawResponse = result.response.text();
    const parsed = JSON.parse(rawResponse);
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error('Error in system design chat API:', e);
    return NextResponse.json({ error: e.message || 'Failed to generate response' }, { status: 500 });
  }
}
