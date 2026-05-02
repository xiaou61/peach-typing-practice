# Typing Practice App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a polished mixed-mode typing practice web app for Chinese, English, symbols, and code snippets.

**Architecture:** Use a Vite + React + TypeScript single-page app. Keep the app static and client-only, with practice state in React and recent results persisted in localStorage.

**Tech Stack:** Vite, React, TypeScript, CSS, localStorage.

---

### Task 1: Scaffold Vite React Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/vite-env.d.ts`

**Steps:**

1. Create the project files with Vite-compatible configuration.
2. Add scripts: `dev`, `build`, `preview`.
3. Install dependencies with `npm install`.
4. Run `npm run build`.
5. Expected: TypeScript and Vite build complete successfully.

### Task 2: Add Practice Data And Utilities

**Files:**
- Create: `src/practiceData.ts`
- Create: `src/typingUtils.ts`

**Steps:**

1. Add typed practice modes: `mixed`, `chinese`, `english`, `symbols`, `code`.
2. Add reusable text banks for each mode.
3. Implement `getRandomPrompt(mode)` and mixed-mode random selection.
4. Implement stat helpers for accuracy, WPM, elapsed time, and result summaries.
5. Run `npm run build`.
6. Expected: build passes.

### Task 3: Build Typing Experience

**Files:**
- Modify: `src/App.tsx`

**Steps:**

1. Add state for mode, prompt, typed text, started time, finished time, error count, duration option, sound setting, and history.
2. Capture typing through a focused input or textarea.
3. Support correct input, wrong input, backspace, completion, restart, and next prompt.
4. Persist recent results in localStorage.
5. Run `npm run build`.
6. Expected: build passes and no type errors.

### Task 4: Design Polished Interface

**Files:**
- Modify: `src/styles.css`
- Modify: `src/App.tsx`

**Steps:**

1. Create responsive app shell with top mode navigation, hero stats, central typing stage, side metrics, and history panel.
2. Style character states: pending, current, correct, wrong.
3. Add refined focus states, buttons, segmented controls, and completion state.
4. Ensure Chinese text uses utf-8 correctly and all visible labels are Chinese.
5. Run `npm run build`.
6. Expected: build passes.

### Task 5: Verify In Browser

**Files:**
- No code file required unless defects are found.

**Steps:**

1. Start local dev server with `npm run dev -- --host 127.0.0.1`.
2. Open the app in a browser.
3. Verify desktop layout, mobile layout, typing flow, mode switching, restart, next prompt, and history.
4. Fix any visual or runtime issues.
5. Run final `npm run build`.
6. Expected: app works locally and production build succeeds.
