<template>
  <div>
    <header class="site-header">
      <h1 class="site-title">News Briefing</h1>
    </header>

    <Transition name="banner">
      <div
        v-if="bannerState !== 'hidden'"
        class="news-banner"
        :class="bannerState"
        @click="handleBannerClick"
      >
        <span v-if="bannerState === 'generating'"
          >New briefing being generated…</span
        >
        <span v-else>Fresh updates ready — tap to scroll up ↑</span>
      </div>
    </Transition>

    <LoadingScreen
      v-if="
        !data?.content &&
        !streamContent &&
        (status === 'pending' || data?.generating)
      "
    />

    <div v-else-if="status === 'error' && !streamContent" class="error-state">
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

    <div v-if="streamContent || data?.content">
      <div class="meta">
        <time
          v-if="data?.createdAt && !streamContent"
          :datetime="data.createdAt"
          >{{ formatDate(data.createdAt) }}</time
        >
        <span v-if="streamContent" class="cached-badge">live</span>
        <span v-else-if="data?.cached" class="cached-badge">cached</span>
      </div>
      <MarkdownContent :content="streamContent || data!.content!" />
    </div>

    <div v-if="previousBriefings.length" class="history-section">
      <button
        class="history-section-toggle"
        @click="historyOpen = !historyOpen"
      >
        <h2 class="history-heading">
          Previous Briefings ({{ previousBriefings.length }})
        </h2>
        <span class="toggle-icon">{{ historyOpen ? "−" : "+" }}</span>
      </button>
      <div v-if="historyOpen" class="history-list">
        <div
          v-for="summary in previousBriefings"
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

    <button
      v-if="canGenerate"
      class="generate-btn"
      :disabled="isRequesting"
      @click="requestGenerate"
    >
      {{ isRequesting ? "Requesting…" : "Generate New" }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { data, status, error, refresh } = await useFetch<{
  content?: string;
  createdAt?: string;
  cached?: boolean;
  generating?: boolean;
  recentCount?: number;
}>("/api/news");

const isRequesting = ref(false);
const bannerState = ref<"hidden" | "generating" | "ready">("hidden");
const didStream = ref(false);

const {
  public: { maxUpdates },
} = useRuntimeConfig();

const canGenerate = computed(() => {
  if (streamContent.value) return false;
  if (data.value?.generating) return false;
  if ((data.value?.recentCount ?? 0) >= maxUpdates) return false;
  return true;
});

async function requestGenerate() {
  isRequesting.value = true;
  try {
    await $fetch("/api/news", { method: "POST" });
    historyOpen.value = false;
    expanded.value = new Set();
    data.value = { generating: true };
  } catch (e: any) {
    console.error("Generate request failed:", e?.data?.error || e.message);
  } finally {
    isRequesting.value = false;
  }
}

const { data: historyData, refresh: refreshHistory } = await useFetch<{
  summaries: { id: number; content: string; createdAt: string }[];
}>("/api/history", { lazy: true });

const previousBriefings = computed(() => {
  if (!historyData.value?.summaries) return [];
  // Skip the first entry — it's the latest briefing already shown above
  return historyData.value.summaries.slice(1);
});

const expanded = ref(new Set<number>());
const historyOpen = ref(false);

function toggle(id: number) {
  const next = new Set(expanded.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expanded.value = next;
}

let eventSource: EventSource | null = null;
const streamContent = ref("");

function connectStream() {
  if (eventSource) return;
  streamContent.value = "";
  didStream.value = true;
  eventSource = new EventSource("/api/news-stream");

  eventSource.addEventListener("chunk", (e) => {
    const { text } = JSON.parse(e.data);
    streamContent.value += text;
  });

  eventSource.addEventListener("idle", () => {
    closeStream();
    refresh();
  });

  eventSource.addEventListener("done", (e) => {
    const { createdAt } = JSON.parse(e.data);
    data.value = {
      content: streamContent.value,
      createdAt,
      cached: false,
      recentCount: (data.value?.recentCount ?? 0) + 1,
    };
    streamContent.value = "";
    closeStream();
  });

  eventSource.addEventListener("error", () => {
    closeStream();
    if (!streamContent.value) {
      setTimeout(() => refresh(), 2000);
    }
  });
}

function closeStream() {
  eventSource?.close();
  eventSource = null;
}

let statusStream: EventSource | null = null;

function connectStatusStream() {
  if (statusStream) return;
  statusStream = new EventSource("/api/status-stream");

  statusStream.addEventListener("generation-start", () => {
    didStream.value = false;
    bannerState.value = "generating";
  });

  statusStream.addEventListener("generation-done", () => {
    if (didStream.value) {
      bannerState.value = "hidden";
      didStream.value = false;
    } else {
      bannerState.value = "ready";
      refresh();
      refreshHistory();
    }
  });
}

function closeStatusStream() {
  statusStream?.close();
  statusStream = null;
}

function handleBannerClick() {
  if (bannerState.value === "ready") {
    bannerState.value = "hidden";
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

onMounted(() => {
  connectStatusStream();

  // Connect immediately if page loads while generation is in progress
  if (data.value?.generating) {
    connectStream();
  }

  watch(data, (val) => {
    if (val?.generating) {
      connectStream();
    }
  });
});

onUnmounted(() => {
  closeStatusStream();
  closeStream();
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
  title: "News Briefing",
});
</script>

<style scoped>
.site-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
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

.generate-btn {
  display: block;
  margin: 2rem auto 0;
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.3rem 0.9rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.generate-btn:hover:not(:disabled) {
  border-color: var(--text-muted);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.history-section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1rem;
  font-family: inherit;
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.history-section-toggle:hover {
  color: var(--text);
}

.history-heading {
  font-size: 0.95rem;
  font-weight: 600;
  color: inherit;
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

.news-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  text-align: center;
  padding: 0.45rem 1rem;
  padding-top: calc(env(safe-area-inset-top, 0px) + 0.45rem);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
}

.news-banner.ready {
  cursor: pointer;
  color: var(--link);
}

.news-banner.ready:hover {
  color: var(--link-hover);
}

.banner-enter-active,
.banner-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
