<template>
  <div
    ref="containerRef"
    class="markdown-body"
    v-html="renderedHtml"
    @click="handleAnchorClick"
  ></div>
</template>

<script setup lang="ts">
import { marked } from "marked";

const renderer = new marked.Renderer();
renderer.link = ({ href, text }) => {
  if (href?.startsWith("http")) {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  return `<a href="${href}" class="anchor-link">${text}</a>`;
};
renderer.code = ({ text, lang }) => {
  if (lang === "mermaid") {
    return `<pre class="mermaid">${text}</pre>`;
  }
  return `<pre><code class="language-${lang || ""}">${text}</code></pre>`;
};
const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const headingSlugCounts = new Map<string, number>();

renderer.heading = ({ text, depth }) => {
  const baseSlug = slugify(text);
  const count = headingSlugCounts.get(baseSlug) || 0;
  headingSlugCounts.set(baseSlug, count + 1);
  const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
  return `<h${depth} id="${slug}">${text}</h${depth}>`;
};

const props = defineProps<{
  content: string;
}>();

const containerRef = ref<HTMLElement | null>(null);

let sanitize:
  | ((html: string, config?: Record<string, unknown>) => string)
  | null = null;

let mermaid: any = null;

if (import.meta.client) {
  const DOMPurify = (await import("dompurify")).default;
  sanitize = (html, config) => DOMPurify.sanitize(html, config);
  mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    themeVariables: {
      darkMode: true,
      background: "transparent",
      primaryColor: "#1a3a4a",
      primaryTextColor: "#e0e0e0",
      primaryBorderColor: "#4a9aba",
      lineColor: "#4a9aba",
      secondaryColor: "#2a2a3a",
      tertiaryColor: "#1a2a2a",
    },
    flowchart: { htmlLabels: true, curve: "basis" },
  });
}

const renderedHtml = computed(() => {
  headingSlugCounts.clear();
  const raw = marked.parse(props.content, { async: false, renderer }) as string;
  return sanitize
    ? sanitize(raw, {
        ADD_ATTR: ["target", "rel", "id", "alt", "loading"],
        ADD_TAGS: ["pre", "img"],
      })
    : raw;
});

const mermaidSvgCache = new Map<string, string>();
let mermaidRunning = false;
let needsRerun = false;

async function renderMermaid() {
  if (!mermaid || !containerRef.value) return;
  const elements = containerRef.value.querySelectorAll("pre.mermaid");
  if (elements.length === 0) return;

  const toRender: Element[] = [];

  // Apply cached SVGs synchronously to prevent flashing during streaming
  for (const el of elements) {
    const source = el.textContent?.trim() || "";
    if (!source) continue;
    const cached = mermaidSvgCache.get(source);
    if (cached) {
      el.innerHTML = cached;
    } else {
      toRender.push(el);
    }
  }

  if (toRender.length === 0) return;

  // Prevent concurrent mermaid.run() — nodes get detached by Vue's v-html updates
  if (mermaidRunning) {
    needsRerun = true;
    return;
  }
  mermaidRunning = true;

  try {
    const sources = toRender.map((el) => el.textContent?.trim() || "");
    await mermaid.run({ nodes: toRender });
    for (let i = 0; i < toRender.length; i++) {
      mermaidSvgCache.set(sources[i], toRender[i].innerHTML);
    }
  } catch {
    // mermaid may fail if nodes were detached mid-render during streaming
  } finally {
    mermaidRunning = false;
    if (needsRerun) {
      needsRerun = false;
      await nextTick();
      renderMermaid();
    }
  }
}

function hideBrokenImages() {
  if (!containerRef.value) return;
  const images = containerRef.value.querySelectorAll("img");
  for (const img of images) {
    if (!img.dataset.errorHandled) {
      img.dataset.errorHandled = "1";
      img.addEventListener("error", () => {
        img.style.display = "none";
      });
    }
  }
}

onMounted(() => {
  renderMermaid();
  hideBrokenImages();
});
watch(
  renderedHtml,
  () => {
    renderMermaid();
    nextTick(hideBrokenImages);
  },
  { flush: "post" },
);

function handleAnchorClick(e: MouseEvent) {
  const link = (e.target as HTMLElement).closest("a.anchor-link");
  if (!link) return;
  e.preventDefault();
  const href = link.getAttribute("href");
  if (!href?.startsWith("#")) return;
  const rawSlug = href.slice(1);
  let decoded = rawSlug;
  try {
    decoded = decodeURIComponent(rawSlug);
  } catch {}
  const normalized = slugify(decoded);
  const el =
    document.getElementById(normalized) ||
    document.getElementById(rawSlug) ||
    document.getElementById(decoded) ||
    findHeadingBySlug(normalized);
  el?.scrollIntoView({ behavior: "instant" });
}

function findHeadingBySlug(targetSlug: string): HTMLElement | null {
  if (!containerRef.value) return null;
  const headings = containerRef.value.querySelectorAll(
    "h1, h2, h3, h4, h5, h6",
  );

  // First pass: exact match
  for (const heading of headings) {
    const headingSlug = slugify(heading.textContent || "");
    if (headingSlug === targetSlug) return heading as HTMLElement;
  }

  // Second pass: fuzzy match — prefer the closest match by length ratio
  let bestMatch: HTMLElement | null = null;
  let bestScore = 0;

  for (const heading of headings) {
    const headingSlug = slugify(heading.textContent || "");
    if (headingSlug.includes(targetSlug) || targetSlug.includes(headingSlug)) {
      const shorter = Math.min(headingSlug.length, targetSlug.length);
      const longer = Math.max(headingSlug.length, targetSlug.length);
      const score = shorter / longer;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = heading as HTMLElement;
      }
    }
  }

  return bestMatch;
}
</script>

<style scoped>
.markdown-body :deep(h1) {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.3;
  color: var(--text);
}

.markdown-body :deep(h2) {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  line-height: 1.3;
  color: var(--text);
}

@media (min-width: 640px) {
  .markdown-body :deep(h1) {
    font-size: 1.75rem;
  }
  .markdown-body :deep(h2) {
    font-size: 1.35rem;
  }
}

.markdown-body :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
}

.markdown-body :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.75;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.markdown-body :deep(li) {
  margin-bottom: 0.4rem;
  line-height: 1.65;
}

.markdown-body :deep(strong) {
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: var(--link);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-body :deep(a:hover) {
  color: var(--link-hover);
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--blockquote-border);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--text-muted);
  font-style: italic;
}

.markdown-body :deep(code) {
  background-color: var(--code-bg);
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-body :deep(pre.mermaid) {
  background: transparent;
  padding: 1rem 0;
  margin: 1.5rem 0;
  overflow-x: auto;
  text-align: center;
}

.markdown-body :deep(pre.mermaid svg) {
  max-width: 100%;
  height: auto;
}

.markdown-body :deep(hr) {
  display: none;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.5rem 0 1rem;
}
</style>
