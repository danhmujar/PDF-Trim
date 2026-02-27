/**
 * PDF Trim - Core Logic & interop bridge
 * -------------------------------------
 * Handles binary ingestion, UI state management, and Wasm lifecycle.
 */

// Helper for DOM Null-Safety
const getSafeElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[DOM] Element #${id} not found.`);
  return el;
};

// DOM Identifiers
const dropZone = getSafeElement("drop-zone");
const fileInput = getSafeElement("file-input");
const keywordInput = getSafeElement("keyword-input");
const extractionMode = getSafeElement("extraction-mode");
const keywordContainer = getSafeElement("keyword-container");
const statusLog = getSafeElement("status-log");
const initialLoader = getSafeElement("initial-loader");

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

        <!-- Header & Intro -->
        <div class="modal-header">
          <h2 id="about-header">About PDF Trim</h2>
          <p>
            A zero-backend, air-gapped PDF document extraction tool running
            entirely in your browser.
          </p>
        </div>

        <!-- Content Grid (2 Columns) -->
        <div class="modal-grid">
          <!-- Tech Stack -->
          <div class="grid-section">
            <h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              Tech Stack
            </h3>
            <div class="tech-badges">
              <span class="badge">PyScript</span>
              <span class="badge">WebAssembly</span>
              <span class="badge">JavaScript</span>
              <span class="badge">PWA</span>
            </div>
          </div>

          <!-- Security/Architecture -->
          <div class="grid-section">
            <h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Architecture
            </h3>
            <ul class="bullet-list">
              <li>100% Client-Side Processing</li>
              <li>Strict CSP & Subresource Integrity</li>
              <li>Zero Data Exfiltration</li>
            </ul>
          </div>

          <!-- Features -->
          <div class="grid-section">
            <h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                ></polygon>
              </svg>
              Features
            </h3>
            <ul class="bullet-list">
              <li>Regex Keyword Extraction</li>
              <li>Executive Remuneration Profiling</li>
              <li>Offline Capable (Service Workers)</li>
            </ul>
          </div>

          <!-- Limitations -->
          <div class="grid-section warning-section">
            <h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Limitations
            </h3>
            <ul class="bullet-list warning-list">
              <li>Initial Wasm load requires ~12MB buffer</li>
              <li>Thread blocking during compute</li>
              <li>Desktop-optimized heavy workloads</li>
            </ul>
          </div>
        </div>

        <!-- Developer Credit Footer -->
        <div class="developer-credit">
          <div class="qr-container">
            <img
              src="frame.png"
              alt="Scan to connect"
              width="72"
              class="qr-code"
              loading="lazy"
            />
          </div>
          <div class="bio-container">
            <h4>Built by Danh Michael Mujar</h4>
            <p class="witty-bio">
              "Business Support Senior Specialist at WTW. Powered by curiosity,
              caffeine, and Generative AI."
            </p>
            <a
              href="https://www.linkedin.com/in/danh-michael-mujar-599112210"
              target="_blank"
              rel="noopener noreferrer"
              class="linkedin-link"
            >
              Connect on LinkedIn <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
        <div style="margin-top: 2rem; border-top: 1px solid var(--glass-border); padding-top: 1.5rem; text-align: center;">
            <button id="reset-app" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--error); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s;">
                Clear Offline Cache & Reset
            </button>
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
        console.log("[SW] Registered successfully.", reg.scope);

        // Auto-update: reload when a new SW takes control
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[SW] New version detected, reloading...");
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
      .catch((err) => console.error("[SW] Registration failed:", err));
  };
  window.addEventListener("load", registerSW);
} else {
  console.warn(
    "Service Workers are not supported. Offline features and Cross-Origin Isolation are disabled.",
  );
}

// ==========================================
// ABOUT MODAL LOGIC
// ==========================================
if (aboutToggleBtn && aboutOverlay) {
  let aboutCloseBtn = null;

  const closeAboutModal = () => {
    aboutOverlay.classList.add("hidden");
    aboutOverlay.setAttribute("aria-hidden", "true");
    aboutToggleBtn.setAttribute("aria-expanded", "false");
    aboutToggleBtn.focus();
  };

  const openAboutModal = () => {
    if (!aboutOverlay.innerHTML.trim()) {
      aboutOverlay.innerHTML = MODAL_HTML;

      const aboutCloseBtn = getSafeElement("about-close");
      if (aboutCloseBtn) {
        aboutCloseBtn.addEventListener("click", closeAboutModal);
      }

      const resetBtn = getSafeElement("reset-app");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          if (
            confirm(
              "This will clear the offline cache and reload the application. Continue?",
            )
          ) {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: "CLEAR_CACHE",
              });
            }
            localStorage.clear();
            sessionStorage.clear();
            setTimeout(() => window.location.reload(), 500);
          }
        });
      }
    }
    aboutOverlay.classList.remove("hidden");
    aboutOverlay.setAttribute("aria-hidden", "false");
    aboutToggleBtn.setAttribute("aria-expanded", "true");

    const aboutCloseBtn = getSafeElement("about-close");
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
  const keyword = keywordInput ? keywordInput.value.trim() : "";
  if (mode === "keyword" && !keyword) {
    window.logStatus(
      "Please specify a target keyword or RegEx expression.",
      "error",
    );
    return;
  }

  processPDF(file, mode, keyword);
}

/**
 * Buffer Management and PyScript Execution Pipeline
 */
async function processPDF(file, mode, keyword) {
  window.logStatus(`Buffering "${file.name}" into HEAP memory...`, "info");
  window.setIndicator("processing");

  if (overlay && overlayText) {
    overlay.classList.remove("hidden");
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
    const synthesizedBytesProxy = await window.process_pdf_wasm(
      uint8Array,
      mode,
      keyword,
      file.name,
    );
    const elapsed = (performance.now() - startTime).toFixed(2);

    if (!synthesizedBytesProxy) {
      window.logStatus(
        `Extraction complete in ${elapsed}ms. No pages matched "${keyword}". Extraction aborted.`,
        "error",
      );
      window.setIndicator("");
      return;
    }

    window.logStatus(
      `Truncation core finalized in ${elapsed}ms. Building Blob...`,
      "success",
    );

    let outBytes;
    if (synthesizedBytesProxy.toJs) {
      outBytes = synthesizedBytesProxy.toJs();
      synthesizedBytesProxy.destroy();
    } else {
      outBytes = synthesizedBytesProxy;
    }

    const blob = new Blob([outBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `[PDF-TRIM]_${file.name}`;

    document.body.appendChild(a);
    a.click();

    // [LOW] Robust Blob URL Revocation
    const cleanup = () => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.removeEventListener("focus", cleanup);
    };
    window.addEventListener("focus", cleanup);
    setTimeout(cleanup, 10000);

    window.logStatus("Truncated PDF synthesis downloaded safely.", "success");
    window.setIndicator("active");
  } catch (err) {
    console.error(err);
    window.logStatus(
      `Pipeline Execution Core Failure: ${err.message}`,
      "error",
    );
    window.setIndicator("");
  } finally {
    if (overlay) overlay.classList.add("hidden");
    if (fileInput) fileInput.value = "";
  }
}
