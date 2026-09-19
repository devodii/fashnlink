export function extractMetaTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const metaRe = /<meta[^>]+>/gi;
  const propRe = /(?:property|name)=["']([^"']+)["']/i;
  const contentRe = /content=["']([^"']*)["']/i;

  for (const tag of html.match(metaRe) ?? []) {
    const prop = tag.match(propRe)?.[1];
    const content = tag.match(contentRe)?.[1];
    if (prop && content !== undefined) tags[prop] = content;
  }
  return tags;
}

export function extractTitleTag(html: string): string | null {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
}

export function extractH1(html: string): string | null {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return match ? match.replace(/<[^>]+>/g, '').trim() : null;
}
