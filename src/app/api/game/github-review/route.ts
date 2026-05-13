import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const REPO_OWNER = 'fangzhzh';
const REPO_NAME  = 'leetcode';

interface CommitSummary {
  date: string;
  message: string;
  files: string[];
}

async function fetchCommitSummaries(): Promise<CommitSummary[]> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'flashcard-game/1.0',
  };

  // 1. Fetch list of recent commits
  const listRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=15`,
    { headers }
  );
  if (!listRes.ok) throw new Error(`GitHub list: ${listRes.status}`);
  const list = await listRes.json() as {
    sha: string;
    commit: { message: string; author: { date: string } };
  }[];

  // 2. Fetch file details for the 6 most recent commits only (to avoid rate limit)
  const detailed = await Promise.all(
    list.slice(0, 6).map(async (c): Promise<CommitSummary> => {
      try {
        const detailRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${c.sha}`,
          { headers }
        );
        if (!detailRes.ok) throw new Error('detail fail');
        const detail = await detailRes.json() as { files?: { filename: string }[] };
        return {
          date: c.commit.author.date.slice(0, 10),
          message: c.commit.message.split('\n')[0],
          files: (detail.files ?? []).map(f => f.filename).slice(0, 8),
        };
      } catch {
        return {
          date: c.commit.author.date.slice(0, 10),
          message: c.commit.message.split('\n')[0],
          files: [],
        };
      }
    })
  );

  // 3. For remaining commits, just use message
  const rest: CommitSummary[] = list.slice(6).map(c => ({
    date: c.commit.author.date.slice(0, 10),
    message: c.commit.message.split('\n')[0],
    files: [],
  }));

  return [...detailed, ...rest];
}

const PROMPT = `You are a coding interview coach analyzing a developer's recent study activity.
Based on the GitHub commits below, generate exactly 15 quiz questions to help them review and strengthen their understanding.

Cover a mix of these areas based on what appears in the commits:
- Algorithm patterns: backtracking, binary search, two pointers, sliding window, heap, graph DFS/BFS
- Data structures: linked list, stack, queue, priority queue, tree
- Complexity: time/space analysis of the specific algorithms studied
- System design coding: multi-threaded components like EventLogger, rate limiters, blocking queues
  (these appear as system design coding interview problems with Java concurrency)
- Key insights: "when to use X vs Y", edge cases, first-principles derivation
- Implementation details: Java-specific patterns (Comparable, Comparator, generics)

Question style mix:
- "What is the time complexity of [algorithm] and why?"
- "When should you use [pattern A] vs [pattern B]?"
- "How does [algorithm/data structure] work step by step?"
- "What is the key insight for solving [problem type]?"
- "In a multi-threaded [component], what synchronization mechanism is needed?"

Rules:
- Write in English (this is a technical interview prep context)
- Each answer (back) should be 1-4 sentences, specific and correct
- Focus on concepts from the actual commits, not generic questions
- Vary difficulty across the 15 questions

Return ONLY a JSON array (no markdown fences):
[{"front": "question", "back": "answer"}, ...]`;

export async function POST() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY not set' }, { status: 500 });

  try {
    const commits = await fetchCommitSummaries();

    const commitText = commits.map(c => {
      const fileList = c.files.length ? `\n  Files: ${c.files.join(', ')}` : '';
      return `[${c.date}] ${c.message}${fileList}`;
    }).join('\n\n');

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const result = await model.generateContent([PROMPT, `Recent commits:\n\n${commitText}`]);
    const text = result.response.text().trim()
      .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    const questions = JSON.parse(text) as { front: string; back: string }[];

    return NextResponse.json({
      questions,
      commitCount: commits.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[github-review]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
