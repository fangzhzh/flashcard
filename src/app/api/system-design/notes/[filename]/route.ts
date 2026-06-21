import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NOTES_DIR = '/Users/zhangzhenfang/workspace/leetcode/systemDesign';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is missing' }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const fullPath = path.join(NOTES_DIR, safeFilename);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    return NextResponse.json({ content });
  } catch (e: any) {
    console.error('Error fetching system design note:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch note' }, { status: 500 });
  }
}
