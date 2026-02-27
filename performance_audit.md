# Performance & Core Web Vitals Audit Report: PDF Trim

**Date:** February 27, 2026  
**Auditor:** Antigravity AI  
**Target:** `C:\Users\Danh Mujar\Desktop\test\PDF Truncate`  
**Scope:** Core Application Performance (`app.js`, `processor.py`, `sw.js`, `index.html`)

---

## 1. Executive Summary

This report analyzes the performance characteristics of the PDF Trim PWA, with a specific focus on Core Web Vitals and the heavy WebAssembly (Wasm) / PyScript runtime overhead. While the application successfully achieves its zero-backend, air-gapped architecture, there are several opportunities to optimize the initial load experience and runtime performance.

**Overall Grade:** B+

---

## 2. Findings by Category

### 2.1 Initial Load & Runtime Overhead

#### [HIGH] Blocking Main Thread During PyScript Initialization

- **Location:** `index.html:28-30`, `processor.py`
- **Issue:** The PyScript runtime (~12MB) is loaded synchronously via `<script type="module">`. This blocks the main thread and delays First Contentful Paint (FCP).
- **Impact:** Users on slower connections may see a blank screen for several seconds while the Wasm heap initializes.
- **Recommendation:** Implement a custom loading screen (skeleton UI) in HTML/CSS that renders immediately, before PyScript loads.

#### [MEDIUM] Redundant Service Worker Network Fallback

- **Location:** `sw.js:54-73`
- **Issue:** The Service Worker fetch handler falls back to network for every cache miss. Since PyScript assets are large, a failed cache lookup results in a slow re-fetch.
- **Impact:** If the PyScript core files are evicted from the cache, the user experiences a re-download of ~12MB.
- **Recommendation:** Ensure aggressive pre-caching in the `install` phase and consider a "cache-first" strategy for known CDN assets.

#### [LOW] No Lazy Loading for Non-Critical Assets

- **Location:** `index.html:210-214`
- **Issue:** The "About" modal image (`frame.png`) and its styles are loaded immediately, even though they are only needed on user interaction.
- **Impact:** Wastes bandwidth during initial load.
- **Recommendation:** Lazy-load the QR code image or defer its loading until the modal is opened.

### 2.2 Core Web Vitals & Responsiveness

#### [HIGH] No Progress Indication During Extraction

- **Location:** `app.js:199-272`, `processor.py:78-124`
- **Issue:** During PDF processing, the user only sees a spinner with a static "Executing Wasm Core..." message. The extraction loop processes pages but does not report progress (e.g., "Processing page 5 of 50...").
- **Impact:** Users processing large PDFs (>100 pages) have no feedback, assuming the app is frozen.
- **Recommendation:** Implement a progress callback from Python to JS that reports `current_page / total_pages`.

#### [MEDIUM] Long-Task Blocking on Large PDFs

- **Location:** `processor.py:78-124`
- **Issue:** The regex extraction loop in `processor.py` runs synchronously on the main thread.
- **Impact:** For PDFs with 500+ pages, the UI thread may be blocked for >3 seconds, triggering "Long Task" warnings in Chrome DevTools.
- **Recommendation:** Break the loop into chunks using `asyncio.sleep(0)` or similar yield points to allow the UI to update.

#### [LOW] Unoptimized Regex Compilation

- **Location:** `processor.py:46-69`
- **Issue:** Regex patterns are compiled inside the function call.
- **Impact:** Minor performance hit on repeated calls.
- **Recommendation:** Move regex compilation to module-level constants (already done for most, verify all).

### 2.3 Memory & Resource Management

#### [MEDIUM] Memory Leak Potential in PyScript Bridge

- **Location:** `app.js:234-239`
- **Issue:** `synthesizedBytesProxy.destroy()` is called, but if the logic errors before this line, the Wasm memory proxy is not cleaned up.
- **Impact:** Over many sessions, this could lead to Wasm heap growth.
- **Recommendation:** Wrap the proxy usage in a `finally` block to ensure cleanup.

#### [LOW] No Debouncing on File Input

- **Location:** `app.js:141-150`
- **Issue:** No debouncing on drag-and-drop or file input change events.
- **Impact:** Rapid file selections could trigger multiple processing queues.
- **Recommendation:** Add a state lock (`isProcessing`) that prevents new uploads until the current one finishes.

---

## 3. Recommended Action Plan

**Immediate Actions:**

1. [TODO] Add page-by-page progress logging from Python to JS.
2. [TODO] Add `isProcessing` guard in `app.js` to prevent race conditions on file input.
3. [TODO] Wrap Wasm proxy cleanup in `finally` block in `app.js`.

**Short-Term Actions:** 4. [TODO] Move regex compilation to module-level constants in `processor.py`. 5. [TODO] Implement chunked processing with `asyncio` yields in Python for large PDFs.

**Long-Term/Strategic Actions:** 6. [TODO] Implement a skeleton loading screen in HTML to unblock the critical rendering path. 7. [TODO] Add Lighthouse CI or basic performance budget checks to the build process. 8. [TODO] Lazy-load the QR code image in the About modal.

---

_End of Report_
