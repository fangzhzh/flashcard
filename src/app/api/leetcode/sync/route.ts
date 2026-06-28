import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { cookie, domain } = await request.json();

    if (!cookie) {
      return NextResponse.json({ error: 'Missing LeetCode cookie' }, { status: 400 });
    }

    const targetDomain = domain === 'leetcode.cn' ? 'leetcode.cn' : 'leetcode.com';

    // Call LeetCode API to fetch all problems with status
    const leetcodeRes = await fetch(`https://${targetDomain}/api/problems/all/`, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://${targetDomain}/`,
      },
      next: { revalidate: 0 } // Disable fetch caching
    });

    if (!leetcodeRes.ok) {
      return NextResponse.json({ 
        error: `LeetCode API returned status ${leetcodeRes.status}. Make sure your cookie is correct and not expired.` 
      }, { status: leetcodeRes.status });
    }

    const data = await leetcodeRes.json();

    // Check if the cookie actually logged the user in
    if (!data.user_name) {
      return NextResponse.json({ 
        error: 'Invalid or expired cookie. You are not logged in according to LeetCode response.' 
      }, { status: 401 });
    }

    const statStatusPairs = data.stat_status_pairs || [];
    
    // Filter out only accepted (solved) problems
    const solvedNums = statStatusPairs
      .filter((p: any) => p.status === 'ac')
      .map((p: any) => p.stat?.frontend_question_id || p.stat?.question_id)
      .filter(Boolean);

    return NextResponse.json({
      username: data.user_name,
      numSolved: data.num_solved || solvedNums.length,
      solvedNums
    });

  } catch (error: any) {
    console.error('[leetcode-sync-failed]', error);
    return NextResponse.json({ error: `Sync failed: ${error.message}` }, { status: 500 });
  }
}
