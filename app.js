/**
 * PDF Trim - Core Logic & interop bridge
 * -------------------------------------
 * Handles binary ingestion, UI state management, and Wasm lifecycle.
 */

// Helper for DOM Null-Safety
const getSafeElement = (id) => {
  const el = document.getElementById(id);
  if (
    !el &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    console.warn(`[DOM] Element #${id} not found.`);
  }
  return el;
};

// DOM Identifiers
const dropZone = getSafeElement("drop-zone");
const fileInput = getSafeElement("file-input");
const keywordInput = getSafeElement("keyword-input");
const extractionMode = getSafeElement("extraction-mode");
const outputFormat = getSafeElement("output-format");
const keywordContainer = getSafeElement("keyword-container");
const statusLog = getSafeElement("status-log");
const initialLoader = getSafeElement("initial-loader");
const themeToggle = getSafeElement("theme-toggle");

// Initialize theme from localStorage (Last used logic)
const initTheme = () => {
  const savedTheme = localStorage.getItem("pdf-trim-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
};

initTheme();

// Theme toggle event listener
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("pdf-trim-theme", newTheme);
  });
}

// Hide initial loader once PyScript is ready
const hideInitialLoader = () => {
  if (initialLoader) {
    initialLoader.style.opacity = "0";
    setTimeout(() => {
      if (initialLoader.parentNode) {
        initialLoader.parentNode.removeChild(initialLoader);
      }
    }, 300);
  }
};

// Poll for PyScript readiness
const checkPyScriptReady = setInterval(() => {
  if (typeof window.process_pdf_wasm === "function") {
    clearInterval(checkPyScriptReady);
    hideInitialLoader();
  }
}, 100);

// Fallback: hide after 30s even if PyScript fails
setTimeout(() => {
  clearInterval(checkPyScriptReady);
  hideInitialLoader();
}, 30000);
const statusIndicator = getSafeElement("status-dot");
const overlay = getSafeElement("processing-overlay");
const overlayText = getSafeElement("overlay-text");

// About Modal Identifiers
const aboutToggleBtn = getSafeElement("about-toggle");
const aboutOverlay = getSafeElement("about-overlay");

const MODAL_HTML = `
      <div
        class="glass-card about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-header"
      >
        <!-- Close Button (X) -->
        <button
          class="modal-close"
          id="about-close"
          aria-label="Close About Dialog"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>

        <!-- Tab Navigation -->
        <nav class="modal-tabs" role="tablist">
          <button class="tab-btn active" id="tab-btn-overview" role="tab" aria-selected="true" aria-controls="panel-overview">Overview</button>
          <button class="tab-btn" id="tab-btn-arch" role="tab" aria-selected="false" aria-controls="panel-arch">Technical Architecture</button>
        </nav>

        <!-- Tab Panel: Overview -->
        <div class="tab-panel active" id="panel-overview" role="tabpanel" aria-labelledby="tab-btn-overview">
          <div class="modal-header">
            <h2 id="about-header">About PDF Trim</h2>
            <p>
              A zero-backend, local PDF document extraction tool running
              entirely in your browser.
            </p>
          </div>

          <div class="feature-list">
            <div class="feature-item">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                Tech Stack
              </h3>
              <p class="section-desc">A pure serverless architecture leveraging modern web standards:</p>
              <div class="tech-badges">
                <span class="badge">PyScript</span>
                <span class="badge">WebAssembly</span>
                <span class="badge">JavaScript</span>
                <span class="badge">PWA</span>
                <span class="badge">pypdf</span>
                <span class="badge">pdfminer.six</span>
              </div>
            </div>

            <div class="feature-item">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Security & Privacy
              </h3>
              <p class="section-desc">Designed with a Zero-Trust, local-first paradigm:</p>
              <ul class="bullet-list">
                <li><strong>100% Client-Side Processing</strong> - Files never leave your device.</li>
                <li><strong>Local Memory Sandbox</strong> - Wasm execution prevents network egress.</li>
                <li><strong>Deep File Validation</strong> - Strict MIME and magic bytes checking.</li>
                <li><strong>Hardware Isolation</strong> - Uses COOP/COEP headers.</li>
              </ul>
            </div>

            <div class="feature-item">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Comprehensive Features
              </h3>
              <p class="section-desc">Advanced heuristics for intelligent document parsing:</p>
              <ul class="bullet-list">
                <li><strong>TOC-Driven Slicing</strong> - Parses metadata bookmarks and visual TOCs to extract exact page ranges.</li>
                <li><strong>Multi-Stage Fallbacks</strong> - Legacy state-machine execution for unstructured legacy documents.</li>
                <li><strong>Multi-Format Export</strong> - Synthesize native PDF documents or output layout-aware Markdown text.</li>
                <li><strong>RegEx Discrete Search</strong> - Granular page truncation matching custom string expressions.</li>
              </ul>
            </div>

            <div class="feature-item warning-item">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                System Limitations
              </h3>
              <p class="section-desc">Due to the constraints of the browser-based execution environment:</p>
              <ul class="bullet-list warning-list">
                <li><strong>Initial Load</strong> - ~20MB buffer payload (cached offline after first visit).</li>
                <li><strong>File Size Cap</strong> - Hard 50MB file size limit to prevent Wasm heap memory exhaustion.</li>
                <li><strong>Thread Blocking</strong> - Heavy processing may temporarily freeze the DOM.</li>
                <li><strong>Markdown Conversion</strong> - Extraction drops complex visual formatting like tables and nested images.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Tab Panel: Architecture -->
        <div class="tab-panel" id="panel-arch" role="tabpanel" aria-labelledby="tab-btn-arch">
          <div class="arch-content">
            <div class="arch-section">
              <h3>🏛️ The PWA Frontend</h3>
              <p>Built with <strong>HTML5, CSS3, and JavaScript</strong>. It handles local file selection, offline caching via Service Workers, and secure memory buffering before yielding to the engine.</p>
              
              <h3>🌉 The PyScript Bridge</h3>
              <p>The secure interop layer that moves raw bytes from JavaScript into the <strong>WebAssembly (Wasm)</strong> environment, enabling near-native Python execution in the browser.</p>
              
              <h3>🚂 The processor.py Engine</h3>
              <p>The core intelligence utilizing <strong>pypdf</strong> and <strong>pdfminer.six</strong>. It parses PDF AST structures, applies <strong>Parent-Bound Slicing</strong> for surgical page extraction, and can optionally generate layout-aware Markdown text outputs leveraging spatial margin calculations (<code>LAParams</code>).</p>
            </div>

            <div class="arch-visual-container">
              <img src="assets/arch_diagram.png" alt="PDF Trim Architectural Diagram" class="arch-diagram-img" loading="lazy" width="800" height="600">
            </div>

            <h3>🪚 Parent-Bound Slicing Logic</h3>
            <p>Unlike keyword scanning, this multi-phase algorithm traverses the internal <strong>Bookmark Tree</strong> to find contextual boundaries (Phase 1). If a metadata roadmap doesn't exist, it applies <strong>Visual TOC Regex Scraping</strong> (Phase 2 & 3) to calculate printed page offsets to absolute indices. It identifies section starts and calculates the range until the next sibling node, ensuring every relevant page is captured before falling back to legacy state-machine heuristics.</p>

            <div class="arch-visual-container">
              <img src="assets/slicing_diagram.png" alt="Parent-Bound Slicing Concept" class="arch-diagram-img" loading="lazy" width="800" height="600">
            </div>

            <div class="arch-note">
              This tool is "local" by default. The WebAssembly sandbox has no network or filesystem access.
            </div>
          </div>
        </div>

        <!-- Developer Credit Footer -->
        <div class="developer-credit">
          <div class="bio-container">
            <h4>Built by Danh Michael Mujar</h4>
            <p class="witty-bio">
              "Business Support Senior Specialist at WTW. Powered by curiosity,
              caffeine, and Generative AI."
            </p>
            <a
              href="https://www.linkedin.com/in/danhmujar"
              target="_blank"
              rel="noopener noreferrer"
              class="linkedin-link"
            >
              Connect on LinkedIn <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>

        <!-- Manual Cache Reset Section -->
        <div class="cache-reset-section">
          <button
            id="clear-cache-btn"
            class="cache-reset-btn"
            aria-label="Clear all application caches and reload the page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="refresh-icon"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
            Clear Cache & Hard Reload
          </button>
          <p class="cache-reset-hint">
            Use this if you encounter persistent issues after an update.
          </p>
        </div>
      </div>
`;

// ==========================================
// SERVICE WORKER REGISTRATION
// ==========================================
if ("serviceWorker" in navigator) {
  const registerSW = () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        if (
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
        ) {
          console.log("[SW] Registered successfully.", reg.scope);
        }

        // Auto-update: reload when a new SW takes control
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
          ) {
            console.log("[SW] New version detected, reloading...");
          }
          window.location.reload();
        });

        // Check for updates immediately after registration
        if (reg.update) {
          reg.update();
        }

        // If not isolated, enforce isolation via reload
        if (window.crossOriginIsolated !== true) {
          const forceReload = () =>
            window.location.replace(window.location.href);
          if (navigator.serviceWorker.controller || reg.active) {
            forceReload();
          }
        }
      })
      .catch((err) => {
        if (
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
        ) {
          console.error("[SW] Registration failed:", err);
        }
      });
  };
  window.addEventListener("load", registerSW);
} else {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    console.warn(
      "Service Workers are not supported. Offline features and Cross-Origin Isolation are disabled.",
    );
  }
}

// ==========================================
// ABOUT MODAL LOGIC
// ==========================================
if (aboutToggleBtn && aboutOverlay) {
  let aboutCloseBtn = null;

  const trapFocus = (e) => {
    if (e.key !== "Tab") return;
    const focusable = aboutOverlay.querySelectorAll(
      'button, [href], input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const closeAboutModal = () => {
    aboutOverlay.classList.add("hidden");
    aboutOverlay.setAttribute("aria-hidden", "true");
    aboutToggleBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", trapFocus);
    aboutToggleBtn.focus();
  };

  const openAboutModal = () => {
    if (!aboutOverlay.innerHTML.trim()) {
      aboutOverlay.innerHTML = MODAL_HTML;
      aboutCloseBtn = getSafeElement("about-close");
      if (aboutCloseBtn) {
        aboutCloseBtn.addEventListener("click", closeAboutModal);
      }

      // Manual Cache Reset Handler
      const clearCacheBtn = getSafeElement("clear-cache-btn");
      if (clearCacheBtn) {
        clearCacheBtn.addEventListener("click", async () => {
          try {
            // Prune all caches (ServiceWorker & HTTP)
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));

            // Unregister all ServiceWorkers
            if ("serviceWorker" in navigator) {
              const registrations =
                await navigator.serviceWorker.getRegistrations();
              await Promise.all(registrations.map((reg) => reg.unregister()));
            }

            // Perform a hard-reload (bypassing browser cache)
            window.location.reload();
          } catch (err) {
            window.logStatus(`Cache pruning failure: ${err.message}`, "error");
          }
        });
      }

      // Tab Switching Logic
      const tabs = aboutOverlay.querySelectorAll(".tab-btn");
      const panels = aboutOverlay.querySelectorAll(".tab-panel");

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
          const targetId = tab.getAttribute("aria-controls");

          tabs.forEach((t) => {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
          });
          panels.forEach((p) => p.classList.remove("active"));

          tab.classList.add("active");
          tab.setAttribute("aria-selected", "true");
          const targetPanel = aboutOverlay.querySelector(`#${targetId}`);
          if (targetPanel) targetPanel.classList.add("active");
        });

        // Arrow Key Navigation
        tab.addEventListener("keydown", (e) => {
          let newIndex = -1;
          if (e.key === "ArrowRight") {
            newIndex = (index + 1) % tabs.length;
          } else if (e.key === "ArrowLeft") {
            newIndex = (index - 1 + tabs.length) % tabs.length;
          } else if (e.key === "Home") {
            newIndex = 0;
          } else if (e.key === "End") {
            newIndex = tabs.length - 1;
          }

          if (newIndex !== -1) {
            e.preventDefault();
            tabs[newIndex].focus();
            tabs[newIndex].click();
          }
        });
      });
    }
    aboutOverlay.classList.remove("hidden");
    aboutOverlay.setAttribute("aria-hidden", "false");
    aboutToggleBtn.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", trapFocus);
    if (aboutCloseBtn) {
      setTimeout(() => aboutCloseBtn.focus(), 100);
    }
  };

  aboutToggleBtn.addEventListener("click", openAboutModal);

  aboutOverlay.addEventListener("click", (e) => {
    if (e.target === aboutOverlay) closeAboutModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !aboutOverlay.classList.contains("hidden")) {
      closeAboutModal();
    }
  });
}

// Toggle UI element visibility based on Mode
if (extractionMode && keywordContainer && keywordInput) {
  extractionMode.addEventListener("change", (e) => {
    if (e.target.value === "keyword") {
      keywordContainer.classList.remove("hidden");
    } else {
      keywordContainer.classList.add("hidden");
      keywordInput.value = "";
    }
  });
}

/**
 * Expose a logging hook to the global window object.
 */
window.logStatus = (message, type = "info") => {
  if (!statusLog) return;
  const li = document.createElement("li");
  li.className = type;
  li.textContent = `[System] ${message}`;
  statusLog.appendChild(li);
  statusLog.parentElement.scrollTop = statusLog.parentElement.scrollHeight;

  if (type === "processing" && overlayText) {
    overlayText.textContent = message;
  }
};

/**
 * Global indicator controller for python Interop
 */
window.setIndicator = (state) => {
  if (!statusIndicator) return;
  statusIndicator.className = "status-indicator";
  if (state) statusIndicator.classList.add(state);
};

// ==========================================
// DRAG AND DROP & Accessibility Keybindings
// ==========================================
if (dropZone && fileInput) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      false,
    );
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => dropZone.classList.add("dragover"),
      false,
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => dropZone.classList.remove("dragover"),
      false,
    );
  });

  dropZone.addEventListener(
    "drop",
    (e) => handleFileSelect(e.dataTransfer.files),
    false,
  );
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFileSelect(e.target.files));

  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
}

/**
 * Validator and file initiation sequence
 */
async function handleFileSelect(files) {
  if (files.length === 0) return;
  const file = files[0];

  // [HIGH] Hard file size limit (50MB) to prevent Wasm heap exhaustion
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    window.logStatus(
      `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed is 50MB.`,
      "error",
    );
    return;
  }

  // Security verification (File extension fallback)
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    window.logStatus(
      "Invalid file type. Please upload a structured PDF document.",
      "error",
    );
    return;
  }

  // [MEDIUM] Deep File Type Validation (Magic Bytes Check)
  try {
    const headerBuffer = await file.slice(0, 5).arrayBuffer();
    const header = new TextDecoder().decode(new Uint8Array(headerBuffer));
    if (header !== "%PDF-") {
      window.logStatus(
        "Security Alert: Invalid PDF signature detected.",
        "error",
      );
      return;
    }
  } catch (err) {
    window.logStatus(
      "Security Alert: Failed to verify file integrity.",
      "error",
    );
    return;
  }

  const mode = extractionMode ? extractionMode.value : "executive";
  const format = outputFormat ? outputFormat.value : "pdf";
  const keyword = keywordInput ? keywordInput.value.trim() : "";
  if (mode === "keyword" && !keyword) {
    window.logStatus(
      "Please specify a target keyword or RegEx expression.",
      "error",
    );
    return;
  }

  processPDF(file, mode, format, keyword);
}

/**
 * Buffer Management and PyScript Execution Pipeline
 */
async function processPDF(file, mode, format, keyword) {
  window.logStatus(`Buffering "${file.name}" into HEAP memory...`, "info");
  window.setIndicator("processing");

  if (overlay && overlayText) {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    overlayText.textContent = `Buffering ${file.name}...`;
  }

  await new Promise((r) => setTimeout(r, 60));

  try {
    const arrayBuffer = await file.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    window.logStatus(
      `Buffered ${byteLength} bytes. Yielding control to Wasm.`,
      "info",
    );

    if (typeof window.process_pdf_wasm !== "function") {
      throw new Error(
        "PyScript WASM Engine is not ready. Please wait a moment while the runtime initializes.",
      );
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    const startTime = performance.now();
    const result = await window.process_pdf_wasm(
      uint8Array,
      mode,
      format,
      keyword,
      file.name,
    );
    const elapsed = (performance.now() - startTime).toFixed(2);

    if (!result) {
      window.logStatus(
        `Extraction complete in ${elapsed}ms. No pages matched "${keyword}". Extraction aborted.`,
        "error",
      );
      window.setIndicator("");
      return;
    }

    // Handle output based on format (pdf vs markdown)
    if (format === "markdown") {
      // result is a string (Markdown text)
      window.logStatus(
        `Markdown extraction complete in ${elapsed}ms. Building download...`,
        "success",
      );

      const markdownText = typeof result === "string" ? result : "";
      const blob = new Blob([markdownText], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.classList.add("hidden");
      a.href = url;
      a.download = `[PDF-TRIM]_${file.name.replace(".pdf", ".md")}`;

      document.body.appendChild(a);
      a.click();

      const cleanup = () => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.removeEventListener("focus", cleanup);
      };
      window.addEventListener("focus", cleanup);
      setTimeout(cleanup, 10000);

      window.logStatus("Markdown file downloaded successfully.", "success");
      window.setIndicator("active");
    } else {
      // result is PDF bytes proxy
      window.logStatus(
        `Truncation core finalized in ${elapsed}ms. Building Blob...`,
        "success",
      );

      let outBytes;
      if (result.toJs) {
        outBytes = result.toJs();
        result.destroy();
      } else {
        outBytes = result;
      }

      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.classList.add("hidden");
      a.href = url;
      a.download = `[PDF-TRIM]_${file.name}`;

      document.body.appendChild(a);
      a.click();

      const cleanup = () => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.removeEventListener("focus", cleanup);
      };
      window.addEventListener("focus", cleanup);
      setTimeout(cleanup, 10000);

      window.logStatus("Truncated PDF synthesis downloaded safely.", "success");
      window.setIndicator("active");
    }
  } catch (err) {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      console.error(err);
    }
    window.logStatus(
      `Pipeline Execution Core Failure: ${err.message}`,
      "error",
    );
    window.setIndicator("");
  } finally {
    if (overlay) {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
    }
    if (fileInput) fileInput.value = "";
  }
}
