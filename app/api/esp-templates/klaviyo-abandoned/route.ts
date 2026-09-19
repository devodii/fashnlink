import { NextResponse } from 'next/server';
import template from '@/config/esp-templates/klaviyo-abandoned.json';

/**
 * Static file download, not an apiHandler route; no auth, no DB, no
 * per-merchant data (section 8.2's "flow template download").
 */
export function GET() {
  return NextResponse.json(template, {
    headers: {
      'content-disposition': 'attachment; filename="klaviyo-abandoned.json"',
      'cache-control': 'public, max-age=3600',
    },
  });
}
