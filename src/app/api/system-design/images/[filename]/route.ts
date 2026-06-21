import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GRAPHS_DIR = '/Users/zhangzhenfang/workspace/leetcode/systemDesign/graphs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return new Response('Filename parameter is missing', { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const fullPath = path.join(GRAPHS_DIR, safeFilename);

    if (!fs.existsSync(fullPath)) {
      return new Response('Image not found', { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.svg') {
      contentType = 'image/svg+xml';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    }

    const fileBuffer = fs.readFileSync(fullPath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e: any) {
    console.error('Error serving system design image:', e);
    return new Response(e.message || 'Failed to serve image', { status: 500 });
  }
}
