import { isPaymentUrl } from "@/lib/capture/payment-guard";

export type SitemapSource =
  | "sitemap.xml"
  | "sitemap_index"
  | "robots.txt"
  | "nav_crawl"
  | "seed";

export type SitemapPage = {
  url: string;
  source: SitemapSource;
};

export type DiscoverPagesResult = {
  origin: string;
  pages: SitemapPage[];
  notes: string[];
};

const DEFAULT_MAX_PAGES = 40;
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "CranialCaptureBot/0.1 (+https://cranial.local; sitemap+nav; readonly)";

/**
 * Discover page URLs for a site: sitemap.xml (and nested indexes), robots.txt
 * Sitemap: lines, then nav-link crawl of the homepage if needed.
 * Payment / pay URLs are always filtered out.
 */
export async function discoverSitePages(
  websiteUrl: string,
  opts?: { maxPages?: number; fetchImpl?: typeof fetch },
): Promise<DiscoverPagesResult> {
  const maxPages = opts?.maxPages ?? DEFAULT_MAX_PAGES;
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const notes: string[] = [];
  const origin = normalizeOrigin(websiteUrl);
  const seed = normalizePageUrl(websiteUrl, origin) ?? origin + "/";

  const collected = new Map<string, SitemapSource>();
  const add = (raw: string, source: SitemapSource) => {
    const url = normalizePageUrl(raw, origin);
    if (!url) return;
    if (isPaymentUrl(url)) return;
    if (!sameRegistrableSite(url, origin)) return;
    if (collected.size >= maxPages && !collected.has(url)) return;
    if (!collected.has(url)) collected.set(url, source);
  };

  add(seed, "seed");

  const robotsSitemaps = await readRobotsSitemaps(origin, fetchImpl, notes);
  const sitemapCandidates = unique([
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    ...robotsSitemaps,
  ]);

  let foundSitemapUrls = false;
  for (const sitemapUrl of sitemapCandidates) {
    const locs = await fetchSitemapLocs(sitemapUrl, fetchImpl, notes, 0);
    if (locs.length) {
      foundSitemapUrls = true;
      for (const loc of locs) {
        // Nested sitemap index entries look like *.xml — follow them.
        if (looksLikeSitemap(loc)) {
          const nested = await fetchSitemapLocs(loc, fetchImpl, notes, 1);
          for (const n of nested) {
            if (!looksLikeSitemap(n)) add(n, "sitemap_index");
          }
        } else {
          add(loc, sitemapUrl.includes("robots") ? "robots.txt" : "sitemap.xml");
        }
      }
    }
  }

  if (!foundSitemapUrls || collected.size <= 1) {
    notes.push(
      foundSitemapUrls
        ? "Sitemap sparse — augmenting with homepage nav links."
        : "No usable sitemap — falling back to homepage nav crawl.",
    );
    const nav = await crawlNavLinks(seed, origin, fetchImpl, notes);
    for (const u of nav) add(u, "nav_crawl");
  }

  const pages = [...collected.entries()].map(([url, source]) => ({ url, source }));
  notes.push(`Discovered ${pages.length} page URL(s) (cap ${maxPages}).`);
  return { origin, pages, notes };
}

/** Convenience: clean URL list only. */
export async function listPageUrls(
  websiteUrl: string,
  opts?: { maxPages?: number },
): Promise<string[]> {
  const result = await discoverSitePages(websiteUrl, opts);
  return result.pages.map((p) => p.url);
}

function normalizeOrigin(websiteUrl: string): string {
  const u = new URL(websiteUrl.includes("://") ? websiteUrl : `https://${websiteUrl}`);
  u.hash = "";
  u.search = "";
  u.pathname = "";
  return u.origin;
}

function normalizePageUrl(raw: string, origin: string): string | null {
  try {
    const u = new URL(raw, origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    // Drop common tracking query noise but keep meaningful paths.
    if ([...u.searchParams.keys()].every((k) => k.startsWith("utm_"))) {
      u.search = "";
    }
    // Strip trailing slash except root
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

function sameRegistrableSite(url: string, origin: string): boolean {
  try {
    const a = new URL(url);
    const b = new URL(origin);
    return a.hostname === b.hostname || a.hostname.endsWith(`.${b.hostname}`);
  } catch {
    return false;
  }
}

function looksLikeSitemap(url: string): boolean {
  const path = url.toLowerCase();
  return path.includes("sitemap") && (path.endsWith(".xml") || path.endsWith(".xml.gz"));
}

async function readRobotsSitemaps(
  origin: string,
  fetchImpl: typeof fetch,
  notes: string[],
): Promise<string[]> {
  try {
    const res = await fetchImpl(`${origin}/robots.txt`, {
      headers: { "user-agent": USER_AGENT, accept: "text/plain,*/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      notes.push(`robots.txt HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    const urls: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (m?.[1]) urls.push(m[1].trim());
    }
    if (urls.length) notes.push(`robots.txt listed ${urls.length} sitemap(s).`);
    return urls;
  } catch (e) {
    notes.push(`robots.txt fetch failed: ${errMsg(e)}`);
    return [];
  }
}

async function fetchSitemapLocs(
  sitemapUrl: string,
  fetchImpl: typeof fetch,
  notes: string[],
  depth: number,
): Promise<string[]> {
  if (depth > 3) return [];
  try {
    const res = await fetchImpl(sitemapUrl, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/xml,text/xml,*/*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      notes.push(`Sitemap ${sitemapUrl} → HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const locs = extractLocTags(xml);
    notes.push(`Parsed ${locs.length} <loc> from ${sitemapUrl}`);
    return locs;
  } catch (e) {
    notes.push(`Sitemap ${sitemapUrl} failed: ${errMsg(e)}`);
    return [];
  }
}

/** Minimal XML loc extractor — no full XML parser dependency. */
export function extractLocTags(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc[^>]*>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const loc = decodeXmlEntities(m[1].trim());
    if (loc) out.push(loc);
  }
  return out;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function crawlNavLinks(
  homeUrl: string,
  origin: string,
  fetchImpl: typeof fetch,
  notes: string[],
): Promise<string[]> {
  try {
    const res = await fetchImpl(homeUrl, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      notes.push(`Homepage crawl HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();
    const hrefs = extractNavHrefs(html);
    const urls = hrefs
      .map((h) => normalizePageUrl(h, origin))
      .filter((u): u is string => Boolean(u));
    notes.push(`Nav crawl found ${urls.length} candidate link(s).`);
    return unique(urls);
  } catch (e) {
    notes.push(`Nav crawl failed: ${errMsg(e)}`);
    return [];
  }
}

/**
 * Prefer links inside <nav> / <header>; fall back to all same-doc anchors.
 */
export function extractNavHrefs(html: string): string[] {
  const chunks: string[] = [];
  const navBlocks =
    html.match(/<(nav|header)\b[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  if (navBlocks.length) chunks.push(...navBlocks);
  else chunks.push(html);

  const hrefs: string[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const chunk of chunks) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk))) {
      const href = m[1].trim();
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }
      hrefs.push(href);
    }
  }
  return hrefs;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
