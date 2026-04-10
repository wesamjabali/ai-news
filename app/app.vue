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
    --bg: #1a1714;
    --text: #c8c0b6;
    --text-muted: #8a8078;
    --border: #2e2925;
    --link: #d4976a;
    --link-hover: #e8b48e;
    --code-bg: #231f1b;
    --blockquote-border: #c4873a;
    --accent: #d4a056;
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media (min-width: 640px) {
  html {
    font-size: 17px;
  }
}

body {
  font-family: "Merriweather", "Georgia", "Times New Roman", serif;
  letter-spacing: 0.015em;
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.7;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

@media (display-mode: standalone) {
  body {
    overscroll-behavior-y: contain;
  }
}

#app {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
  padding-top: calc(env(safe-area-inset-top, 0px) + 1.25rem);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 3rem);
  padding-left: calc(env(safe-area-inset-left, 0px) + 1rem);
  padding-right: calc(env(safe-area-inset-right, 0px) + 1rem);
  min-height: 100vh;
  min-height: 100dvh;
}

@media (min-width: 640px) {
  #app {
    padding: 2rem 1.5rem 4rem;
    padding-top: calc(env(safe-area-inset-top, 0px) + 2rem);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 4rem);
    padding-left: calc(env(safe-area-inset-left, 0px) + 1.5rem);
    padding-right: calc(env(safe-area-inset-right, 0px) + 1.5rem);
  }
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
