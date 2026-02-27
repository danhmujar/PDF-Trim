# Pending Audit Categories

**Generated:** February 27, 2026
**Project:** PDF Trim (Offline-First PDF Processing PWA)
**Status:** Awaiting Prioritization

---

## 1. Performance & Core Web Vitals (RESOLVED)

### Phase 1: Critical Render Path Optimization (DONE)

- **Issue:** PyScript (~12MB) loads synchronously, blocking initial render.
- **Resolution:** Implemented an initial loading skeleton/spinner that shows immediately while PyScript initializes. Loader is removed via `app.js` once the WASM engine is ready.

### Phase 2: Main Thread Yielding (DONE)

- **Issue:** PDF page extraction loop (in `processor.py`) ran synchronously without yielding.
- **Resolution:** Converted `process_pdf_wasm` to `async` and added `await asyncio.sleep(0)` within the extraction loop to maintain UI responsiveness on large files.

### Phase 3: Lazy Loading Non-Critical Assets (DONE)

- **Issue:** About modal and QR image loaded with the initial page payload.
- **Resolution:** Moved About modal HTML to a JS constant and injected it only on demand. Added `loading="lazy"` to the QR image.

## 2. PWA Compliance & Offline Resilience

- `manifest.json` completeness (icons, display mode, start_url, scope)
- Offline behavior when PyScript CDN assets fail to cache
- Installability criteria (Lighthouse PWA audit)
- SW cache invalidation strategy

## 3. Error Handling & Edge Cases

- Corrupted PDF handling (valid magic bytes but malformed structure)
- Encrypted/password-protected PDFs
- Zero-page PDFs or PDFs with no extractable text
- What happens if PyScript runtime fails to load entirely
- Multiple rapid file uploads (race conditions in the UI)

## 4. Cross-Browser Compatibility

- Safari WebAssembly/SharedArrayBuffer quirks
- Mobile browser support (touch events for drag-and-drop)
- Feature detection gaps (e.g., `crossOriginIsolated` behavior varies)

## 5. Testing Coverage

- Currently **zero unit tests** exist in the repo
- No integration tests for the JS-to-Python bridge
- No automated accessibility testing (e.g., axe-core)

## 6. UX Robustness

- No progress indicator during page-by-page extraction (just spinner)
- No way to cancel an in-progress extraction
- No file metadata preview before processing (page count, file size)

---

_To be prioritized by user in next instruction._
