// src/app/charts/page.tsx (Server Component by default)
import 'server-only'
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  // Read directory or files on the server side
  const dirPath = path.join(process.cwd(), 'public');
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
