<template>
  <div class="loading-screen">
    <div class="loading-content">
      <div class="pulse-ring">
        <div class="pulse-dot"></div>
      </div>
      <p class="loading-status">{{ currentMessage }}</p>
      <p class="loading-sub">This may take a moment</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const messages = [
  "Gathering the latest news…",
  "Fetching from Al Jazeera…",
  "Reading Middle East Eye…",
  "Scanning Mondoweiss…",
  "Reading Arabic sources…",
  "Translating…",
  "Reviewing Hebrew sources…",
  "Translating…",
  "Gathering more sources…",
  "Reviewing Palestine Chronicle…",
  "Reviewing additional sources…",
  "Reviewing additional sources…",
  "Reviewing additional sources…",
  "Searching for Breaking News…",
  "Adding Context…",
  "Analyzing with AI…",
  "Composing your briefing…",
  "Composing your briefing…",
  "Refining key takeaways…",
  "Composing your briefing…",
  "Reviewing for accuracy…",
  "Finalizing your briefing…",
  "Finalizing your briefing…",
  "Finalizing your briefing…",
  "Finalizing your briefing…",
  "Finalizing your briefing…",
];

const currentIndex = ref(0);
const currentMessage = computed(() => messages[currentIndex.value]);

let interval: ReturnType<typeof setInterval>;

onMounted(() => {
  interval = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % messages.length;
  }, 2500);
});

onUnmounted(() => {
  clearInterval(interval);
});
</script>

<style scoped>
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}

.loading-content {
  text-align: center;
}

.pulse-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 2rem;
  position: relative;
}

.pulse-ring::before {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--accent);
  opacity: 0.3;
  animation: pulse-expand 2s ease-out infinite;
}

.pulse-ring::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--accent);
  opacity: 0.3;
  animation: pulse-expand 2s ease-out infinite 1s;
}

.pulse-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--accent);
  animation: pulse-glow 2s ease-in-out infinite;
}

.loading-status {
  font-size: 1.1rem;
  color: var(--text);
  margin-bottom: 0.5rem;
  min-height: 1.5em;
  transition: opacity 0.3s ease;
  animation: fade-cycle 2.5s ease-in-out infinite;
}

.loading-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
}

@keyframes pulse-expand {
  0% {
    transform: scale(0.5);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes fade-cycle {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
</style>
