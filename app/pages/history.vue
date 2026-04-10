<template>
  <div>
    <header class="site-header">
      <h1 class="site-title">Briefing History</h1>
      <nav class="site-nav">
        <NuxtLink to="/">Latest Briefing</NuxtLink>
      </nav>
    </header>

    <div v-if="status === 'pending'" class="loading-simple">
      Loading history…
    </div>

    <div v-else-if="data?.summaries.length === 0" class="empty-state">
      <p>
        No briefings yet. Visit the <NuxtLink to="/">main page</NuxtLink> to
        generate one.
      </p>
    </div>

    <div v-else-if="data" class="history-list">
      <div
        v-for="summary in data.summaries"
        :key="summary.id"
        class="history-entry"
      >
        <button class="history-toggle" @click="toggle(summary.id)">
          <time :datetime="summary.createdAt">{{
            formatDate(summary.createdAt)
          }}</time>
          <span class="toggle-icon">{{
            expanded.has(summary.id) ? "−" : "+"
          }}</span>
        </button>
        <div v-if="expanded.has(summary.id)" class="history-content">
          <MarkdownContent :content="summary.content" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data, status } = await useFetch<{
  summaries: { id: number; content: string; createdAt: string }[];
}>("/api/history", { lazy: true });

const expanded = ref(new Set<number>());

function toggle(id: number) {
  const next = new Set(expanded.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expanded.value = next;
}

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
  title: "Briefing History — Palestine News",
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

.loading-simple {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-muted);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.history-entry {
  border-bottom: 1px solid var(--border);
}

.history-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  transition: color 0.2s ease;
}

.history-toggle:hover {
  color: var(--link);
}

.history-toggle time {
  font-size: 0.9rem;
}

.toggle-icon {
  font-size: 1.2rem;
  font-weight: 300;
  color: var(--text-muted);
  width: 1.5rem;
  text-align: center;
}

.history-content {
  padding: 1rem 0 2rem;
  animation: slide-down 0.2s ease;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
