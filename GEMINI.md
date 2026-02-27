# Project Brief: Offline-First PDF Processing PWA

## Project Context & Tech Stack
This project is an offline-first, highly secure Progressive Web Application (PWA) built on a purely serverless paradigm. It leverages WebAssembly (Wasm) and PyScript to execute heavy computational workloads directly in the browser. The system provides a zero-trust, client-side document processing pipeline that parses complex PDF structures, conducts localized NLP/regex-based keyword extraction (e.g., identifying governance artifacts like "CEO" or "remuneration table"), and dynamically synthesizes a targeted, truncated PDF document containing exclusively the relevant pages. All data processing occurs entirely within the sandboxed browser execution environment, ensuring absolute data privacy.
- **Tech Stack:** HTML5, CSS3, JavaScript (ES6+), WebAssembly (Wasm), PyScript, Python (`pypdf`), Service Workers.
- **Architecture:** Zero-Backend, Static-Site Generation (SSG), Air-Gapped Local Processing.

## Skill Utilization
To accomplish this task effectively, prioritize the following Agent Skills discovered in the workspace:

### Primary Skills (Core Implementation)
1. **`frontend-developer`**: Utilize this skill for architecting the PWA foundation (`index.html`, responsive `styles.css`, `manifest.json`) and implementing offline-first caching strategies using Service Workers (`sw.js`). Covers PWA implementation, service worker patterns, and responsive design.
2. **`javascript-pro`**: Leverage this skill for managing complex asynchronous state transitions, non-blocking UI thread management, and handling browser APIs (Blob, File API) for binary file ingestion, execution yielding, and downloading. Covers async/await patterns, event loop mastery, and cross-browser compatibility.
3. **`python-pro`**: Apply this skill to engineer the PyScript processing loop, ensuring the `pypdf` library efficiently maps Wasm execution, conducts structural parsing, and reconstructs the byte-stream securely within the Wasm memory heap.

### Secondary Skills (Security, Performance & Quality)
4. **`frontend-security-coder`**: Apply this skill for implementing Content Security Policy (CSP) headers, Subresource Integrity (SRI) for PyScript CDN resources, secure DOM manipulation (textContent over innerHTML), input validation on file uploads, and PWA-specific security hardening (service worker isolation, secure caching, manifest security).
5. **`web-performance-optimization`**: Utilize this skill for optimizing Core Web Vitals, minimizing main thread blocking during Wasm compute, implementing aggressive caching strategies, and ensuring the critical rendering path is unblocked. Essential for managing the heavy PyScript/Wasm runtime overhead.
6. **`accessibility-compliance-accessibility-audit`**: Apply this skill for WCAG 2.1 AA compliance, ensuring keyboard navigation of the file upload and processing UI, proper ARIA attributes on dynamic state indicators (spinners, progress bars, modal locks), and screen reader compatibility for all processing status updates.

## Blast Radius (Scope)
The scope of this task is strictly confined to the frontend components and the PyScript Wasm runtime interop wrapper. You are ONLY permitted to create, read, and modify the following files:
* `./index.html`
* `./styles.css`
* `./manifest.json`
* `./sw.js`
* `./app.js` (JavaScript DOM logic and PyScript bridging)
* `./processor.py` (PyScript Wasm execution logic)

*Modification of any files or directories outside this explicit list is strictly forbidden.*

## Micro-Task Checklist
- [ ] **Task 1: Scaffold PWA Foundation**
  Create `./index.html`, `./styles.css`, and `./manifest.json` to establish the responsive interface, mapping asynchronous state indicators for blocking compute operations.
- [ ] **Task 2: Implement Aggressive Caching (Service Worker)**
  Develop `./sw.js` to cache static assets and preemptively pull Wasm/PyScript runtime dependencies, guaranteeing zero-backend offline execution capability.
- [ ] **Task 3: Develop JavaScript Interop & Buffer Management**
  Implement `./app.js` to handle Blob/File API data ingestion, force non-blocking UI state updates (spinners, modal locks), and yield thread control to the Wasm environment securely.
- [ ] **Task 4: Engineer PyScript Wasm Pipeline**
  Write `./processor.py` calling the `pypdf` library to parse Wasm byte arrays. Iteratively filter page structures based on local regex definitions and synthesize a unified PDF document entirely within Wasm heap memory.
- [ ] **Task 5: Final Blob Reconstruction & Extrusion**
  Construct the return bridge from PyScript to JavaScript in `./app.js` to catch the generated binary data, translate it into an extrudable Wasm object URL via `Blob`, and systematically trigger the client-side download to the user.
