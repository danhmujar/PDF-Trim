from pyscript import window
import io
import re
import asyncio
import os
from collections import Counter
from pypdf import PdfReader, PdfWriter
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams

def get_outline_ranges(reader, patterns, exclusions):
    """Phase 1: Metadata Bookmark Parsing [Parent-Bound Projection]."""
    try:
        outline = reader.outline
    except (AttributeError, Exception) as e:
        window.logStatus(f"Bookmark parsing unavailable: {str(e)}", "warning")
        return []
        
    if not outline:
        return []

    found_ranges = []
    
    def get_start_page(item):
        try:
            return reader.get_destination_page_number(item)
        except (AttributeError, ValueError) as e:
            return None

    def get_title(item):
        title = getattr(item, 'title', '')
        if not title and isinstance(item, dict):
            title = item.get('/Title', '')
        return title

    def traverse(item_list, list_end_page):
        # Clean the list so each node pairs with its children correctly
        nodes = []
        for x in item_list:
            if not isinstance(x, list):
                nodes.append({"dest": x, "children": []})
            else:
                if nodes:
                    nodes[-1]["children"] = x
                    
        for i, node in enumerate(nodes):
            start_page = get_start_page(node["dest"])
            if start_page is None: continue
            
            # Calculate when this node logically ends (start of the next node at same level, or parent's end)
            node_end_page = list_end_page
            for j in range(i + 1, len(nodes)):
                next_start = get_start_page(nodes[j]["dest"])
                if next_start is not None and next_start >= start_page:
                    node_end_page = next_start
                    break
                    
            title = get_title(node["dest"])
            matched = False
            
            # Use explicit exclusionary filtering to prevent matching financial table sub-notes
            if any(p.search(title) for p in patterns) and not exclusions.search(title):
                matched = True
                
            if matched and node_end_page > start_page:
                found_ranges.append((start_page, node_end_page))
                # Skip traversing children since we are capturing this entire parent block
            else:
                if node["children"]:
                    traverse(node["children"], node_end_page)

    traverse(outline, len(reader.pages))
    return found_ranges

def get_visual_toc_entries(reader, patterns):
    """Phase 2: Visual TOC Regex Scraping."""
    toc_text = ""
    toc_start_idx = -1
    
    # Scan first 15 pages for TOC
    for i in range(min(15, len(reader.pages))):
        text = reader.pages[i].extract_text()
        if text and re.search(r'(?:Contents|Table of Contents|In this report)', text, re.IGNORECASE):
            if toc_start_idx == -1:
                toc_start_idx = i
            toc_text += text + "\n"
            
    if not toc_text:
        return [], -1
        
    entries = []
    # Match Title ... PageNumber
    line_pattern = re.compile(r'^(.*?)\s+[\.\s]*\s*(\d+)$')
    
    lines = toc_text.splitlines()
    for line in lines:
        line = line.strip()
        match = line_pattern.search(line)
        if match:
            title, page_num = match.groups()
            entries.append({'title': title.strip(), 'printed_page': int(page_num)})
            
    found_ranges = []
    for i, entry in enumerate(entries):
        if any(p.search(entry['title']) for p in patterns):
            start_p = entry['printed_page']
            end_p = -1
            if i + 1 < len(entries):
                end_p = entries[i+1]['printed_page']
            found_ranges.append((start_p, end_p))
            
    return found_ranges, toc_start_idx

def calculate_page_offset(reader, toc_idx):
    """Phase 3: Page Offset Calculation Bridge."""
    offsets = []
    # Sample a range of pages where printed numbers are likely present
    sample_indices = range(max(0, toc_idx), min(len(reader.pages), toc_idx + 20))
    
    for idx in sample_indices:
        text = reader.pages[idx].extract_text()
        if not text: continue
        
        lines = text.strip().splitlines()
        if not lines: continue
        
        potential_nums = []
        for line in [lines[0], lines[-1]]:
            m = re.search(r'^\s*(\d+)\s*$', line)
            if m:
                potential_nums.append(int(m.group(1)))
        
        for pn in potential_nums:
            # Absolute Index = Printed Number + Offset
            # Offset = Absolute Index - Printed Number
            offsets.append(idx - pn)
                
    if not offsets:
        return 0
    
    counts = Counter(offsets)
    if not counts: return 0
    return counts.most_common(1)[0][0]

def _format_as_markdown(text):
    """
    Apply basic Markdown formatting to extracted text.
    """
    if not text:
        return ""
    
    lines = text.split('\n')
    formatted_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines but preserve them
        if not stripped:
            formatted_lines.append("")
            continue
        
        # Detect headings based on common patterns (ALL CAPS or Title Case short lines)
        if len(stripped) < 60 and stripped.isupper():
            formatted_lines.append(f"## {stripped}")
        # Detect numbered list items
        elif re.match(r'^\d+[\.\)]\s+', stripped):
            formatted_lines.append(stripped)
        # Detect bullet points
        elif stripped.startswith(('- ', '• ', '* ')):
            formatted_lines.append(stripped)
        # Detect email/phone patterns - format as code
        elif '@' in stripped or re.search(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', stripped):
            formatted_lines.append(f"`{stripped}`")
        else:
            # Regular paragraph text
            formatted_lines.append(stripped)
    
    # Join with double newlines to create paragraph breaks
    result = '\n'.join(formatted_lines)
    
    # Add header
    result = f"""# Extracted PDF Content

{result}

---
*Generated by PDF Trim - Local PDF Extraction Tool*
"""
    
    return result

async def process_pdf_wasm(byte_array_proxy, mode, format, keyword, filename):
    """
    Main execution pipeline called by JavaScript.
    Refactored to support TOC-driven extraction with cascading fallbacks.
    Supports output formats: 'pdf' (default) or 'markdown'.
    """
    try:
        window.logStatus("Local runtime engaged.", "processing")
        
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
        
        # ── EXECUTIVE MODE: TOC-DRIVEN STRATEGY ──
        if mode == 'executive':
            window.logStatus("Deep Profiling: Initializing TOC-driven extraction strategy...", "processing")
            
            # ESRS G1 / Remuneration Patterns
            bio_section_keywords = re.compile(
                r'(?:Board of Management|Supervisory Board|Board of Directors|Executive Board|Executive Leadership|Board Members|Board Composition|Administrative Body|Administrative Bodies|Executive Directors|Non-Executive Directors|Board Committees?|Corporate Governance Report|Corporate Governance Statement|Declaration of Conformity|Corporate Governance Code|Governance Structure|Governance Bodies?|Nomination Committee|Audit Committee|Corporate Profile|Strategy and Management|Fundamental Information About the Group)',
                re.IGNORECASE
            )
            rem_start = re.compile(
                r'(?:Remuneration\s+Report|Directors[\'\u2019]?\s+Remuneration\s+Report|Directors[\'\u2019]?\s+Remuneration|Compensation\s+Report|Compensation\s+Discussion\s+and\s+Analysis|Executive\s+Compensation|Board\s+and\s+Executive\s+Remuneration|Remuneration\s+Policy|Summary\s+Compensation\s+Table|Remuneration\s+Statement|Remuneration\s+of\s+the\s+Board|Remuneration\s+of\s+Directors|Directors[\'\u2019]?\s+Compensation|Report\s+on\s+Remuneration)',
                re.IGNORECASE
            )
            rem_end = re.compile(
                r'(?:Financial\s+Statements|Consolidated\s+Financial|Independent\s+Auditor|Auditor[\'\u2019]?\s+Report|Notes\s+to\s+the\s+(?:Consolidated|Accounts|Financial)|Shareholder\s+Information|Consolidated\s+(?:Income|Balance|Statement))',
                re.IGNORECASE
            )
            
            target_patterns = [bio_section_keywords, rem_start]
            
            # Explicit Exclusions to prevent capturing deep financial notes
            exclusions = re.compile(
                r'(?:Total\s+compensation|Overall\s+Assessment|Opportunities|Risks)',
                re.IGNORECASE
            )
            
            end_patterns = [rem_end]
            target_indices = set()
            strategy_used = "Legacy State-Machine"

            # PHASE 1: Metadata Bookmark Parsing
            ranges = get_outline_ranges(reader, target_patterns, exclusions)
            if ranges:
                strategy_used = "Metadata Bookmarks"
                window.logStatus(f"TOC Strategy: Found {len(ranges)} sections via metadata bookmarks.", "info")
                for start, end in ranges:
                    for i in range(start, min(end, total_pages)):
                        target_indices.add(i)
            
            # PHASE 2 & 3: Visual TOC Regex Scraping & Offset Calculation
            if not target_indices:
                visual_ranges, toc_idx = get_visual_toc_entries(reader, target_patterns)
                if visual_ranges:
                    strategy_used = "Visual TOC Scraping"
                    offset = calculate_page_offset(reader, toc_idx)
                    window.logStatus(f"TOC Strategy: Visual TOC found. Calculated page offset: {offset}.", "info")
                    for start_p, end_p in visual_ranges:
                        # Index = Printed + Offset
                        start_abs = start_p + offset
                        # If no end found in TOC, default to 30 pages
                        end_abs = end_p + offset if end_p > 0 else start_abs + 30
                        for i in range(max(0, start_abs), min(end_abs, total_pages)):
                            target_indices.add(i)
            
            # PHASE 5: Legacy State-Machine (Final Fallback)
            if not target_indices:
                window.logStatus("TOC Strategy: No roadmap found. Falling back to heuristic scanning.", "warning")
                
                toc_bypass = min(8, int(total_pages * 0.05)) if total_pages > 40 else 0
                bio_markers = re.compile(r'(?:born\s+(?:in|on)|appointed|member\s+since|curriculum\s+vitae|date\s+of\s+birth|nationality|education|career|professional\s+experience|age\s*:|term\s+of\s+office|mandate|tenure|independent\s+director|diversity\s+policy|skills\s+matrix|board\s+evaluation)', re.IGNORECASE)
                finance_disqualifiers = re.compile(r'(?:revenue|EBITDA|operating\s+profit|cash\s+flow|net\s+income|earnings\s+per\s+share|gross\s+profit|total\s+assets|fiscal\s+year|balance\s+sheet|income\s+statement|free\s+cash|dividends?\s+per|cost\s+of\s+(?:goods|sales)|capital\s+expenditure|depreciation|amortization)', re.IGNORECASE)
                
                is_rem_recording = False
                rem_current_block_size = 0
                PAGE_BUDGET = 50
                
                for i in range(total_pages):
                    await asyncio.sleep(0)
                    if i < toc_bypass: continue
                    page = reader.pages[i]
                    text = page.extract_text()
                    if not text: continue
                    
                    if bio_section_keywords.search(text):
                        if len(bio_markers.findall(text)) >= 2 and len(finance_disqualifiers.findall(text)) < 3:
                            target_indices.add(i)
                    
                    if not is_rem_recording:
                        if rem_start.search(text) and len(text.split()) < 800:
                            is_rem_recording = True
                            rem_current_block_size = 0
                    elif is_rem_recording:
                        if rem_end.search(text) or rem_current_block_size >= PAGE_BUDGET:
                            is_rem_recording = False
                    
                    if is_rem_recording:
                        target_indices.add(i)
                        rem_current_block_size += 1
            
            # Final Synthesis
            all_target_pages = sorted(list(target_indices))
            for idx in all_target_pages:
                writer.add_page(reader.pages[idx])
                matched_pages += 1
            
            window.logStatus(f"Extraction complete. Strategy: {strategy_used}. Captured {matched_pages} pages.", "success")

        # ── KEYWORD MODE: DISCRETE TRUNCATION ──
        else:
            pattern = re.compile(re.escape(keyword), re.IGNORECASE)
            window.logStatus(f"Executing discrete Keyword extraction on {total_pages} nodes...", "processing")
            
            for i in range(total_pages):
                await asyncio.sleep(0)
                page = reader.pages[i]
                text = page.extract_text()
                if text and pattern.search(text):
                    writer.add_page(page)
                    matched_pages += 1

        if matched_pages == 0:
            return None
            
        window.logStatus(f"Synthesized {matched_pages} target pages. Initiating output generation...", "success")
        
        # Handle output based on format
        if format == "markdown":
            # Write truncated PDF to virtual filesystem for pdfminer to read
            output_stream = io.BytesIO()
            writer.write(output_stream)
            truncated_pdf_bytes = output_stream.getvalue()
            
            # Create a temporary file in virtual filesystem
            temp_pdf_path = "/tmp/truncated_input.pdf"
            with open(temp_pdf_path, "wb") as f:
                f.write(truncated_pdf_bytes)
            
            # Extract text using pdfminer.six
            try:
                laparams = LAParams(line_margin=0.5, word_margin=0.1, char_margin=2.0)
                markdown_text = extract_text(temp_pdf_path, laparams=laparams)
                
                # Basic Markdown formatting
                markdown_text = _format_as_markdown(markdown_text)
            finally:
                # Clean up temp file
                try:
                    os.remove(temp_pdf_path)
                except Exception:
                    pass
            
            return markdown_text
        else:
            # Return PDF bytes as before
            output_stream = io.BytesIO()
            writer.write(output_stream)
            return output_stream.getvalue()
        
    except Exception as e:
        # Only log to browser console in development
        try:
            if window.location.hostname in ('localhost', '127.0.0.1'):
                window.console.error(f"Local Execution Fault (Internal): {str(e)}")
        except Exception:
            pass
        window.logStatus(f"Pipeline Execution Core Failure: {str(e)}", "error")
        raise e

window.process_pdf_wasm = process_pdf_wasm
window.logStatus("Local Wasm logic successfully loaded.", "success")
window.setIndicator("active")
