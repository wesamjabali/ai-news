<template>
  <div
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
const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

renderer.heading = ({ text, depth }) => {
  const slug = slugify(text);
  return `<h${depth} id="${slug}">${text}</h${depth}>`;
};

const props = defineProps<{
  content: string;
}>();

let sanitize:
  | ((html: string, config?: Record<string, unknown>) => string)
  | null = null;

if (import.meta.client) {
  const DOMPurify = (await import("dompurify")).default;
  sanitize = (html, config) => DOMPurify.sanitize(html, config);
}

const renderedHtml = computed(() => {
  const raw = marked.parse(props.content, { async: false, renderer }) as string;
  return sanitize ? sanitize(raw, { ADD_ATTR: ["target", "rel", "id"] }) : raw;
});

function handleAnchorClick(e: MouseEvent) {
  const link = (e.target as HTMLElement).closest("a.anchor-link");
  if (!link) return;
  e.preventDefault();
  const href = link.getAttribute("href");
  if (!href?.startsWith("#")) return;
  const rawSlug = href.slice(1);
  const normalized = rawSlug
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const el =
    document.getElementById(normalized) || document.getElementById(rawSlug);
  el?.scrollIntoView({ behavior: "instant" });
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

.markdown-body :deep(hr) {
  display: none;
}
</style>
