const MAGNET_RE = /magnet:\?xt=urn:[a-z0-9]+:[a-zA-Z0-9]{32,}&?[^\s\n\r]*/gi;
const TORRENT_URL_RE = /https?:\/\/[^\s\n\r]+\.torrent\b[^\s\n\r]*/gi;

function sanitizeUrl(url: string): string {
  return url.replace(/"|\'|`/g, '');
}

export function extractLinks(text: string): string[] {
  const found = new Set<string>();
  const addAll = (re: RegExp) => {
    for (const m of text.matchAll(re)) {
      const raw = m[0].trim();
      if (raw.length < 10) continue;
      found.add(sanitizeUrl(raw));
    }
  };
  addAll(MAGNET_RE);
  addAll(TORRENT_URL_RE);
  return Array.from(found);
}

