import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NOTES_DIR = '/Users/zhangzhenfang/workspace/leetcode/systemDesign';

export async function GET() {
  try {
    if (!fs.existsSync(NOTES_DIR)) {
      return NextResponse.json({ error: `Directory not found: ${NOTES_DIR}` }, { status: 404 });
    }

    const files = fs.readdirSync(NOTES_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');

    const notes = mdFiles.map(filename => {
      const fullPath = path.join(NOTES_DIR, filename);
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Try to find the first heading # Title
      const match = content.match(/^#\s+(.+)$/m);
      const title = match ? match[1].trim() : filename.replace('.md', '');

      return {
        filename,
        title,
        sizeBytes: stat.size,
      };
    });

    // Sort notes alphabetically
    notes.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

    return NextResponse.json(notes);
  } catch (e: any) {
    console.error('Error listing system design notes:', e);
    return NextResponse.json({ error: e.message || 'Failed to list notes' }, { status: 500 });
  }
}
