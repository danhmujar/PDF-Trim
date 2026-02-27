from pyscript import window
import io
import re
import asyncio
from pypdf import PdfReader, PdfWriter

async def process_pdf_wasm(byte_array_proxy, mode, keyword, filename):
    """
    Main execution pipeline called by JavaScript, mapping the WASM Uint8 array bytes.
    Now supports both 'keyword' discrete extraction and 'executive' deep profiling
    using a multi-page state-machine.
    """
    try:
        window.logStatus("Air-gap runtime engaged.", "processing")
        
        # Convert JS Proxy of Uint8Array directly into native Python bytes in WASM memory heap
        try:
            raw_bytes = byte_array_proxy.to_bytes()
        except AttributeError:
            raw_bytes = bytes(byte_array_proxy)
            
        pdf_file = io.BytesIO(raw_bytes)
        window.logStatus("Parsing abstract syntax tree (AST)...", "processing")
        reader = PdfReader(pdf_file)
        writer = PdfWriter()
        
        total_pages = len(reader.pages)
        matched_pages = 0
        
        # ==========================================
        # MULTI-PROFILE EXTRACTION ENGINE (PHASE 5)
        # ==========================================
        if mode == 'executive':
            window.logStatus("Deep Profiling: Initializing multi-profile extraction engine...", "processing")
            
            # Dynamic TOC Bypass: skip first few pages to avoid Table of Contents collisions, safely capping the blindspot at 8 pages.
            toc_bypass = min(8, int(total_pages * 0.05)) if total_pages > 40 else 0
            if toc_bypass > 0:
                window.logStatus(f"TOC Bypass Active: Skipping first {toc_bypass} pages.", "processing")
            
            # Hard cap: no single recording block can exceed this many pages
            PAGE_BUDGET = 50
            
            # ── PROFILE A: Executive Bios ──
            # Triple-condition: page must contain a section header, 2+ bio markers, 
            # AND must NOT contain financial density markers (negative filter).
            bio_section_keywords = re.compile(
                r'(?:Board of Management|Supervisory Board|Board of Directors|Executive Board|Executive Management|Executive Leadership|Board Members|Board Composition|Administrative Body|Administrative Bodies|Executive Directors|Non-Executive Directors|Board Committees?)',
                re.IGNORECASE
            )
            bio_markers = re.compile(
                r'(?:born\s+(?:in|on)|appointed|member\s+since|curriculum\s+vitae|date\s+of\s+birth|nationality|education|career|professional\s+experience|age\s*:|term\s+of\s+office|mandate|tenure|independent\s+director)',
                re.IGNORECASE
            )
            # Negative filter: pages dominated by financial content are disqualified
            finance_disqualifiers = re.compile(
                r'(?:revenue|EBITDA|operating\s+profit|cash\s+flow|net\s+income|earnings\s+per\s+share|gross\s+profit|total\s+assets|fiscal\s+year|balance\s+sheet|income\s+statement|free\s+cash|dividends?\s+per|cost\s+of\s+(?:goods|sales)|capital\s+expenditure|depreciation|amortization)',
                re.IGNORECASE
            )
            
            # ── PROFILE B: Remuneration Report ──
            # Contiguous state-machine: activates on a strong header, records until an end boundary or page budget.
            rem_start = re.compile(
                r'(?:Remuneration\s+Report|Directors[\'\u2019]?\s+Remuneration|Compensation\s+Report|Compensation\s+Discussion\s+and\s+Analysis|Executive\s+Compensation|Board\s+and\s+Executive\s+Remuneration|Remuneration\s+Policy|Summary\s+Compensation\s+Table|Remuneration\s+Statement|Remuneration\s+of\s+the\s+Board|Remuneration\s+of\s+Directors|Directors[\'\u2019]?\s+Compensation|Report\s+on\s+Remuneration)',
                re.IGNORECASE
            )
            rem_end = re.compile(
                r'(?:Financial\s+Statements|Consolidated\s+Financial|Independent\s+Auditor|Auditor[\'\u2019]?\s+Report|Notes\s+to\s+the\s+(?:Consolidated|Accounts|Financial)|Shareholder\s+Information|Consolidated\s+(?:Income|Balance|Statement))',
                re.IGNORECASE
            )
            
            # Track which pages belong to which profile
            bio_pages = set()
            rem_pages = set()
            is_rem_recording = False
            rem_block_count = 0
            rem_current_block_size = 0
            
            for i, page in enumerate(reader.pages):
                # Yield control to browser to keep UI responsive
                await asyncio.sleep(0)
                
                # ── Lazy TOC Skip: don't even extract text for bypassed pages ──
                if i < toc_bypass:
                    continue
                
                text = page.extract_text()
                if not text:
                    continue
                    
                # ── Profile A: Bio check (per-page, no state) ──
                # Triple-condition: section keyword + 2+ bio markers + not overwhelmed by finance terms
                if bio_section_keywords.search(text):
                    bio_hits = len(bio_markers.findall(text))
                    finance_hits = len(finance_disqualifiers.findall(text))
                    if bio_hits >= 2 and finance_hits < 3:
                        bio_pages.add(i)
                
                # ── Profile B: Remuneration state machine ──
                if not is_rem_recording:
                    if rem_start.search(text):
                        # Validate this is likely a section header page, not a casual mention.
                        # Header pages tend to have fewer words on them.
                        word_count = len(text.split())
                        if word_count < 800:  # A dense narrative page has 800+ words
                            is_rem_recording = True
                            rem_block_count += 1
                            rem_current_block_size = 0
                            window.logStatus(f"Remuneration Block {rem_block_count} Activated: Page {i+1}.", "info")
                elif is_rem_recording:
                    if rem_end.search(text) or rem_current_block_size >= PAGE_BUDGET:
                        is_rem_recording = False
                        reason = "budget cap" if rem_current_block_size >= PAGE_BUDGET else "end boundary"
                        window.logStatus(f"Remuneration Block {rem_block_count} Complete ({reason}): Page {i+1}. Captured {rem_current_block_size} pages.", "info")
                
                if is_rem_recording:
                    rem_pages.add(i)
                    rem_current_block_size += 1
            
            # ── Merge both profiles ──
            all_target_pages = sorted(bio_pages | rem_pages)
            
            window.logStatus(f"Profile A (Bios): {len(bio_pages)} pages identified.", "info")
            window.logStatus(f"Profile B (Remuneration): {len(rem_pages)} pages captured across {rem_block_count} block(s).", "info")
            
            for idx in all_target_pages:
                writer.add_page(reader.pages[idx])
                matched_pages += 1
                    
        # ==========================================
        # LEGACY KEYWORD ENGINE (PHASE 1)
        # ==========================================
        else:
            pattern = re.compile(re.escape(keyword), re.IGNORECASE)
            window.logStatus(f"Executing discrete Keyword extraction on {total_pages} nodes...", "processing")
            
            for i, page in enumerate(reader.pages):
                await asyncio.sleep(0)
                text = page.extract_text()
                if text and pattern.search(text):
                    writer.add_page(page)
                    matched_pages += 1
                    
        # ==========================================
        # BUFFER EXTRUSION
        # ==========================================
        if matched_pages == 0:
            return None
            
        window.logStatus(f"Synthesized {matched_pages} target pages. Initiating memory transfer...", "processing")
        
        output_stream = io.BytesIO()
        writer.write(output_stream)
        return output_stream.getvalue()
        
    except Exception as e:
        window.console.error(f"Local Execution Fault (Internal): {str(e)}")
        window.logStatus("A fatal error occurred during PDF processing. Check the console for details.", "error")
        raise e

# Construct execution bridge mapping python object definition globally back to JavaScript
window.process_pdf_wasm = process_pdf_wasm

# Announce boot complete
window.logStatus("Python Wasm Infrastructure Initialized.", "success")
window.setIndicator("active")
