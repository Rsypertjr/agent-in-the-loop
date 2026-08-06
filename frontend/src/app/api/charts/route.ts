// src/app/charts/page.tsx (Server Component by default)
import 'server-only'
import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {

  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get('ticker'); // "123"
  // Read directory or files on the server side
  const dirPath = path.join(process.cwd(), 'public', ticker.toLowerCase());
  let files: string[] = [];
  
  try {
    files = await fs.readdir(dirPath);

  } catch (error) {
    console.error("Failed to read directory:", error);
  }
  const data = {"files": files}
  // Pass data to the Client Component
  return NextResponse.json(data);
}
