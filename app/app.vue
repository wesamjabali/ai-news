<template>
  <div id="app">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
:root {
  --bg: #fafaf9;
  --text: #1c1917;
  --text-muted: #78716c;
  --border: #e7e5e4;
  --link: #9a3412;
  --link-hover: #c2410c;
  --code-bg: #f5f5f4;
  --blockquote-border: #d97706;
  --accent: #92400e;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0c0a09;
    --text: #e7e5e4;
    --text-muted: #a8a29e;
    --border: #292524;
    --link: #fb923c;
    --link-hover: #fdba74;
    --code-bg: #1c1917;
    --blockquote-border: #d97706;
    --accent: #fbbf24;
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 17px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.7;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

#app {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  padding-top: calc(env(safe-area-inset-top, 0px) + 2rem);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 4rem);
  padding-left: calc(env(safe-area-inset-left, 0px) + 1.5rem);
  padding-right: calc(env(safe-area-inset-right, 0px) + 1.5rem);
  min-height: 100vh;
  min-height: 100dvh;
}

a {
  color: var(--link);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--link-hover);
}
</style>
