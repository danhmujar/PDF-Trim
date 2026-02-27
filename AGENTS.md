# Agent Instructions: Offline-First PDF Processing PWA

This repository contains an offline-first, highly secure Progressive Web Application (PWA) built on a purely serverless, zero-trust paradigm. It leverages WebAssembly (Wasm) and PyScript to execute heavy computational workloads directly in the browser, ensuring absolute data privacy. 

These guidelines are meant for AI coding agents (like yourself) operating in this repository. Read and follow these rules strictly.

## 1. Scope & Blast Radius ⚠️

Your scope is strictly confined to the frontend components and the PyScript Wasm runtime interop wrapper. You are **ONLY** permitted to create, read, and modify the following files:
- `index.html`
- `styles.css`
- `manifest.json`
- `sw.js` (Service Worker)
- `app.js` (JavaScript DOM logic and PyScript bridging)
- `processor.py` (PyScript Wasm execution logic)

*Modification of any files or directories outside this explicit list is strictly forbidden.*

## 2. Build, Lint, and Test Commands

### Running the Application (Zero-Backend)
- **Serve locally**: Run `python -m http.server 8000` or `npx serve .` in the root directory.
- **Access**: Open `http://localhost:8000` in your browser.
- **Service Worker Reset**: Bypass cache via hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) when modifying `sw.js`.

### Testing (Crucial for Wasm/UI interop)
Because the Python code relies on the PyScript `window` proxy for DOM manipulation, tests for `processor.py` must isolate the business logic.
- **Run a single Python test**: `pytest -k "test_function_name" path/to/test_file.py`
- **Run a specific test with output**: `pytest -s -v path/to/test_file.py`
- **Run all Python tests**: `pytest`
- **Test Isolation**: Ensure you mock the `window` object in pytest if testing `processor.py` locally outside the browser context.
- **JS Testing**: Use `npm test -- path/to/test.js` to run isolated JavaScript tests.

### Linting & Formatting
- **Python Lint/Format**: `ruff check .` and `ruff format .`
- **JS Lint/Format**: `npx eslint . --ext .js` and `npx prettier --write "**/*.js"`

## 3. Architecture & Code Style Guidelines

### 3.1 Python (`processor.py` / PyScript Wasm Pipeline)
- **Role**: Call the `pypdf` library to parse Wasm byte arrays. Synthesize unified PDF documents entirely within Wasm heap memory.
- **Style**: Adhere to PEP 8. Use 4 spaces for indentation. Max line length is 88 characters.
- **Typing & Naming**: Use strict type hints (`typing` module) for all arguments/returns. Use `snake_case` for variables/functions and `PascalCase` for classes.
- **Wasm/PyScript Interop**: Gracefully handle `Proxy` conversions when passing bytes from JS (e.g., `byte_array_proxy.to_bytes()`).
- **Decoupling**: Keep UI manipulation strictly within dedicated bridge functions. Do not scatter `window.document.getElementById` throughout the core extraction logic.

### 3.2 JavaScript (`app.js` / Interop & Buffer Management)
- **Role**: Handle Blob/File API data ingestion, force non-blocking UI state updates (spinners, modal locks), yield thread control to the Wasm environment, and systematically trigger client-side downloads via `Blob` object URLs.
- **Style**: Modern ES6+ vanilla JavaScript in strict mode (`"use strict";`). Prefer `const` over `let`.
- **Async Management**: Prefer `async`/`await` over `.then()`. Wrap await calls in `try...catch` blocks.
- **Security**: Use secure DOM manipulation. Always prefer `textContent` over `innerHTML` to prevent XSS. Ensure strict input validation on file uploads.

### 3.3 HTML, CSS & Accessibility
- **Semantic HTML**: Use native semantic tags (`<main>`, `<section>`, etc.) to unblock the critical rendering path.
- **CSS Architecture**: Use modern CSS variables in `:root`. Adopt a BEM-like methodology. Avoid inline styles.
- **Accessibility (WCAG 2.1 AA)**: Ensure keyboard navigation for file upload and processing UI. Use proper ARIA attributes on dynamic state indicators (spinners, progress bars, modal locks) and ensure screen reader compatibility for processing updates.

### 3.4 Security & Performance Tuning
- **Security Validation**: Implement Content Security Policy (CSP) headers and Subresource Integrity (SRI) for PyScript CDN resources. Ensure service worker isolation.
- **Performance (Core Web Vitals)**: Minimize main thread blocking during heavy PyScript/Wasm runtime overhead. Yield to the browser render cycle if processing large chunks of data in JS.
- **Service Worker (`sw.js`)**: Implement aggressive caching strategies to preemptively pull Wasm/PyScript runtime dependencies, guaranteeing true offline execution capability.

## 4. Agent Operational Rules

1. **Adhere to Blast Radius**: Never modify files outside the approved list.
2. **Context First**: Use `grep` or `glob` to read surrounding code (especially JS to Python bridging) before attempting edits.
3. **Paths**: Always use absolute paths when reading or writing files via your tools.
4. **Deterministic Execution**: Execute local builds and run specific tests (e.g., `pytest -k "test_name"`) to verify Wasm memory interop. Self-correct by reading stack traces.
5. **No Hallucinated Dependencies**: Do not add unnecessary JavaScript libraries or Python packages. Rely on native browser APIs and the existing `pypdf`/PyScript stack to preserve the air-gap.
6. **Communication**: State plans briefly. Do not over-explain code unless specifically asked. Do not revert commits unless explicitly authorized.