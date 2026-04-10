<template>
  <div>
    <header class="site-header">
      <h1 class="site-title">Palestine News Briefing</h1>
      <nav class="site-nav">
        <NuxtLink to="/history">View History</NuxtLink>
      </nav>
    </header>

    <LoadingScreen v-if="status === 'pending' || data?.generating" />

    <div v-else-if="status === 'error'" class="error-state">
      <p class="error-title">Unable to load news</p>
      <p class="error-detail">
        {{
          error?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again later."
        }}
      </p>
      <button class="retry-btn" @click="refresh()">Try Again</button>
    </div>

    <div v-else-if="data?.content">
      <div class="meta">
        <time :datetime="data.createdAt!">{{
          formatDate(data.createdAt!)
        }}</time>
        <span v-if="data.cached" class="cached-badge">cached</span>
      </div>
      <MarkdownContent :content="data.content" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { data, status, error, refresh } = await useFetch<{
  content?: string;
  createdAt?: string;
  cached?: boolean;
  generating?: boolean;
}>("/api/news", {
  lazy: true,
});

let pollTimer: ReturnType<typeof setTimeout> | null = null;

watch(data, (val) => {
  if (val?.generating) {
    pollTimer = setTimeout(() => refresh(), 3000);
  }
});

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer);
});

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
  title: "Palestine News Briefing",
});
</script>

<style scoped>
.site-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.site-title {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.site-nav a {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.site-nav a:hover {
  color: var(--link);
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

.cached-badge {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border: 1px solid var(--border);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
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
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.retry-btn:hover {
  border-color: var(--text-muted);
}
</style>
