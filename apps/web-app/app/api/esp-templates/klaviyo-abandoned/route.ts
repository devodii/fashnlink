import { NextResponse } from 'next/server';
import template from '@/esp-templates/klaviyo-abandoned.json';

/** A static file download, deliberately not an apiHandler route; no auth, no DB, no per-merchant data. */
export function GET() {
  return NextResponse.json(template, {
    headers: {
      'content-disposition': 'attachment; filename="klaviyo-abandoned.json"',
      'cache-control': 'public, max-age=3600',
    },
  });
}
