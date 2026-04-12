<template>
  <div>
    <header class="site-header">
      <NuxtLink to="/" class="back-link">← Back to latest</NuxtLink>
      <h1 class="site-title">News Briefing</h1>
    </header>

    <div v-if="status === 'pending'" class="loading-state">
      <p>Loading report…</p>
    </div>

    <div v-else-if="status === 'error' || !data?.content" class="error-state">
      <p class="error-title">Report not found</p>
      <p class="error-detail">
        This report may have been removed or the link is invalid.
      </p>
      <NuxtLink to="/" class="retry-btn">Go to latest briefing</NuxtLink>
    </div>

    <div v-else>
      <div class="meta">
        <time :datetime="data.createdAt">{{ formatDate(data.createdAt) }}</time>
        <span class="archived-badge">archived</span>
      </div>
      <MarkdownContent :content="data.content" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const id = route.params.id;

const { data, status } = await useFetch<{
  id: number;
  content: string;
  createdAt: string;
}>(`/api/report/${id}`);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "Z");
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

useHead({
  title: data.value?.createdAt
    ? `Report — ${formatDate(data.value.createdAt)}`
    : "News Briefing",
});
</script>

<style scoped>
.site-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.back-link {
  display: inline-block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--text);
}

.site-title {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.meta {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.meta time {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.archived-badge {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border: 1px solid var(--border);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}

.loading-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-muted);
}

.error-state {
  text-align: center;
  padding: 4rem 1rem;
}

.error-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.error-detail {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.retry-btn {
  display: inline-block;
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.retry-btn:hover {
  border-color: var(--text-muted);
}
</style>
