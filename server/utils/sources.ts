import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
});

const SOURCES = [
  // Arabic-language sources (prioritized for analysis)
  {
    name: "Al Jazeera Arabic",
    url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9",
  },
  {
    name: "Al Araby Al Jadeed",
    url: "https://www.alaraby.co.uk/rss",
  },
  {
    name: "Al Mayadeen",
    url: "https://www.almayadeen.net/rss/LatestNews",
  },
  {
    name: "Al Akhbar",
    url: "https://al-akhbar.com/rss",
  },
  {
    name: "Al Quds Al Arabi",
    url: "https://www.alquds.co.uk/feed/",
  },
  {
    name: "Arabi21",
    url: "https://arabi21.com/feed/rss",
  },
  {
    name: "RT Arabic",
    url: "https://arabic.rt.com/rss/",
  },
  {
    name: "Raseef22",
    url: "https://raseef22.net/feed",
  },

  // Palestinian ground-level sources
  {
    name: "Quds News Network",
    url: "https://qudsnen.co/feed/",
  },
  {
    name: "Shehab News",
    url: "https://shehabnews.com/feed/",
  },
  {
    name: "Maan News",
    url: "https://www.maannews.net/feed/",
  },

  // Non-Western English sources
  {
    name: "Middle East Monitor",
    url: "https://www.middleeastmonitor.com/feed/",
  },
  {
    name: "Al Jazeera English",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  { name: "Middle East Eye", url: "https://www.middleeasteye.net/rss" },
  { name: "The New Arab", url: "https://www.newarab.com/rss" },
  { name: "Press TV", url: "https://www.presstv.ir/RSS" },
  {
    name: "Anadolu Agency",
    url: "https://www.aa.com.tr/en/rss/default?cat=world",
  },
  { name: "TRT World", url: "https://www.trtworld.com/rss" },

  // Israeli/Hebrew perspective (used with caution, supplementary only)
  { name: "+972 Magazine", url: "https://www.972mag.com/feed/" },

  // Palestinian sources
  {
    name: "Electronic Intifada",
    url: "https://electronicintifada.net/rss.xml",
  },
  { name: "Mondoweiss", url: "https://mondoweiss.net/feed/" },
  {
    name: "Palestine Chronicle",
    url: "https://www.palestinechronicle.com/feed/",
  },
];

interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl?: string;
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return feed.items.slice(0, 15).map((item) => {
        // Extract image from enclosure or <img> in content HTML
        let imageUrl =
          (item.enclosure?.type?.startsWith("image/") && item.enclosure.url) ||
          "";
        if (!imageUrl && item.content) {
          const imgMatch = item.content.match(/<img[^>]+src=['"]([^'"]+)['"]/);
          if (imgMatch?.[1]) imageUrl = imgMatch[1];
        }
        return {
          source: source.name,
          title: item.title || "",
          description: (item.contentSnippet || item.content || "").slice(
            0,
            2000,
          ),
          link: item.link || "",
          pubDate: item.pubDate || "",
          ...(imageUrl && { imageUrl }),
        };
      });
    }),
  );

  const articles: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }

  return deduplicateArticles(articles);
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u0600-\u06FF\u200B-\u200F\u202A-\u202E]/g, (c) => c) // keep Arabic chars
    .replace(/[^\p{L}\p{N}\s]/gu, "") // strip punctuation, keep letters/numbers
    .replace(/\s+/g, " ")
    .trim();
}

function wordSet(text: string): Set<string> {
  return new Set(text.split(" ").filter((w) => w.length > 2));
}

function similarity(a: string, b: string): number {
  const setA = wordSet(normalizeTitle(a));
  const setB = wordSet(normalizeTitle(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  return intersection / Math.min(setA.size, setB.size);
}

function deduplicateArticles(articles: NewsItem[]): NewsItem[] {
  const clusters: NewsItem[][] = [];

  for (const article of articles) {
    if (!article.title) continue;
    let merged = false;
    for (const cluster of clusters) {
      if (similarity(article.title, cluster[0].title) > 0.6) {
        cluster.push(article);
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push([article]);
    }
  }

  // From each cluster, pick the article with the longest description,
  // but note all sources that covered the story
  return clusters.map((cluster) => {
    const best = cluster.reduce((a, b) =>
      b.description.length > a.description.length ? b : a,
    );
    if (cluster.length > 1) {
      const otherSources = cluster
        .filter((a) => a.source !== best.source)
        .map((a) => a.source);
      const unique = [...new Set(otherSources)];
      if (unique.length > 0) {
        best.description += `\n\nAlso reported by: ${unique.join(", ")}`;
      }
    }
    return best;
  });
}
