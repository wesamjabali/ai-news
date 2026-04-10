import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
});

const SOURCES = [
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "Middle East Eye", url: "https://www.middleeasteye.net/rss" },
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
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return feed.items.slice(0, 15).map((item) => ({
        source: source.name,
        title: item.title || "",
        description: (item.contentSnippet || item.content || "").slice(0, 500),
        link: item.link || "",
        pubDate: item.pubDate || "",
      }));
    }),
  );

  const articles: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }

  return articles;
}
