# Typing Practice Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve typing flow, recent performance insight, and responsive visual polish for the existing typing practice app.

**Architecture:** Keep the app as a static Vite + React + TypeScript single-page application. Add small derived-stat helpers in `typingUtils.ts`, wire keyboard and streak behavior in `App.tsx`, and update CSS for clearer hierarchy and mobile stability.

**Tech Stack:** Vite, React, TypeScript, CSS, localStorage.

---

### Task 1: Add History Summary Helpers

**Files:**
- Modify: `src/typingUtils.ts`

**Steps:**

1. Add a `HistorySummary` interface with `runCount`, `bestWpm`, `averageWpm`, and `averageAccuracy`.
2. Add `summarizeHistory(history: PracticeResult[]): HistorySummary`.
3. Return zero/default values when history is empty.
4. Run `npm run build`.
5. Expected: TypeScript and Vite build pass.

### Task 2: Improve Typing Flow

**Files:**
- Modify: `src/App.tsx`

**Steps:**

1. Import `summarizeHistory`.
2. Add `streakCount` state.
3. Reset streak on restart, mode change, next prompt, duration change, and error.
4. Increase streak when newly typed characters are all correct.
5. Add a document keydown handler:
   - `Escape` calls restart.
   - `Ctrl + Enter` or `Meta + Enter` calls next prompt.
6. Keep focus on the textarea after keyboard actions.
7. Run `npm run build`.
8. Expected: build passes and typing still works.

### Task 3: Add Performance Overview UI

**Files:**
- Modify: `src/App.tsx`

**Steps:**

1. Derive `historySummary` from `history`.
2. Add a compact stats overview above the history list.
3. Add a streak badge in the practice toolbar or stage status.
4. Add title labels for shortcut-enabled controls.
5. Run `npm run build`.
6. Expected: summary renders for empty and non-empty history.

### Task 4: Polish Visual Styling

**Files:**
- Modify: `src/styles.css`

**Steps:**

1. Strengthen the prompt card contrast and current character treatment.
2. Add styles for summary cards and streak badge.
3. Improve history item layout for scanning.
4. Tighten mobile spacing and responsive grids.
5. Run `npm run build`.
6. Expected: no CSS syntax errors and layout remains responsive.

### Task 5: Browser Verification

**Files:**
- Modify files only if defects are found.

**Steps:**

1. Start dev server with `npm run dev -- --host 127.0.0.1`.
2. Open the app in browser.
3. Verify desktop layout.
4. Verify mobile layout.
5. Test typing, errors, streak reset, `Esc`, `Ctrl + Enter`, next prompt, restart, completion, and history summary.
6. Run final `npm run build`.
7. Expected: app works locally and production build succeeds.
