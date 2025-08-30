import { extractLinks } from '../src/shared/utils/parser';

describe('extractLinks', () => {
  it('extracts magnet links and .torrent URLs', () => {
    const text = `Check this magnet:?xt=urn:btih:0123456789ABCDEF0123456789ABCDEF and https://example.com/file.torrent`;
    const links = extractLinks(text);
    expect(links.length).toBe(2);
    expect(links[0]).toMatch(/magnet:/);
    expect(links[1]).toMatch(/\.torrent/);
  });

  it('deduplicates links', () => {
    const text = `x magnet:?xt=urn:btih:ABCDEFABCDEFABCDEFABCDEFABCDEFAB magnet:?xt=urn:btih:ABCDEFABCDEFABCDEFABCDEFABCDEFAB`;
    const links = extractLinks(text);
    expect(links.length).toBe(1);
  });
});

