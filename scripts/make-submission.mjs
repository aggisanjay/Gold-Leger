import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { marked } from "marked";

// Read raw markdown
let md = readFileSync("TECHNICAL_DESIGN.md", "utf8");

// Strip the redundant top header from markdown body since we build a dedicated corporate header card
md = md.replace(/^# Gold Ledger[^\n]*\n+/m, "");
md = md.replace(/\*\*GitHub Repository:\*\*[^\n]*\n+/m, "");
md = md.replace(/\*\*Live Deployed Application:\*\*[^\n]*\n+/m, "");
md = md.replace(/\*\*Client:\*\*[^\n]*\n+/m, "");
md = md.replace(/\*\*Author:\*\*[^\n]*\n+/m, "");
md = md.replace(/\*\*Status:\*\*[^\n]*\n+/m, "");
md = md.replace(/^---\s*\n+/m, "");

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Format mathematical formulas cleanly for HTML rendering
function cleanMath(text) {
  return text
    // Display Math
    .replace(/\$\$\\sum \\Delta \\text\{fine\\_mg\} = 0\$\$/g, '<div class="math-block"><span class="math-sym">&Sigma;</span> &Delta; fine_mg = 0 <span class="math-note">(Zero-Sum Invariant)</span></div>')
    .replace(/\$\$\\sum \\text\{fine\\_mg\} = 0\$\$/g, '<div class="math-block"><span class="math-sym">&Sigma;</span> &Delta; fine_mg = 0 <span class="math-note">(Zero-Sum Invariant)</span></div>')
    .replace(/\$\$\\text\{Use of Allowance\} = \\frac\{\\text\{Actual Wastage mg\}\}\{\\text\{Allowed Wastage mg\}\}\$\$/g, '<div class="math-block"><span class="math-var">Use of Allowance</span> = <span class="math-frac"><span class="math-num">Actual Wastage (mg)</span><span class="math-den">Allowed Wastage (mg)</span></span></div>')
    // Inline Math
    .replace(/\$\\text\{fine\\_mg\} = \\lfloor \\frac\{\\text\{gross\\_mg\} \\times \\text\{purity\\_bp\}\}\{10,000\} \\rfloor\$/g, '<code class="math-inline">fine_mg = &lfloor; (gross_mg &times; purity_bp) / 10,000 &rfloor;</code>')
    .replace(/\$\\text\{paise\} = \\lfloor \\frac\{\\text\{net\\_mg\} \\times \\text\{purity\\_bp\} \\times \\text\{rate\\_paise\}\}\{10,000,000\} \\rfloor\$/g, '<code class="math-inline">paise = &lfloor; (net_mg &times; purity_bp &times; rate_paise) / 10,000,000 &rfloor;</code>')
    .replace(/\$\\text\{Total Recovered\} = \\text\{Finished\} \\+ \\text\{Scrap\} \\+ \\text\{Filings\}\$/g, '<code class="math-inline">Total Recovered = Finished + Scrap + Filings</code>')
    .replace(/\$\\text\{Actual Wastage\} = \\text\{Issued\} - \\text\{Total Recovered\}\$/g, '<code class="math-inline">Actual Wastage = Issued - Total Recovered</code>')
    .replace(/\$\\text\{Allowed Wastage\} = \\lfloor \\text\{Issued\} \\times \\text\{Agreed \\%\} \\rfloor\$/g, '<code class="math-inline">Allowed Wastage = &lfloor; Issued &times; Agreed % &rfloor;</code>')
    .replace(/\$\\text\{Excess Loss\} = \\max\(0, \\text\{Actual Wastage\} - \\text\{Allowed Wastage\}\)\$/g, '<code class="math-inline">Excess Loss = max(0, Actual Wastage - Allowed Wastage)</code>')
    .replace(/\$\\sum \\text\{fine\\_mg\} = 0\$/g, '<code class="math-inline">&Sigma; fine_mg = 0</code>')
    .replace(/\$0\.001\\text\{g\} - 5,000\.000\\text\{g\}\$/g, '<code>0.001g – 5,000.000g</code>')
    .replace(/\$< 1\\text\{ ms\}\$/g, '&lt; 1 ms')
    .replace(/\$>\s*1\.8\s*\\times\$/g, '&gt; 1.8&times;')
    .replace(/\$>\s*2\.5\s*\\times\$/g, '&gt; 2.5&times;')
    .replace(/\$\\ge\s*5\$/g, '&ge; 5')
    .replace(/\$>\s*₹2,00,000\$/g, '&gt; ₹2,00,000')
    .replace(/\$\\ge\s*₹2,00,000\$/g, '&ge; ₹2,00,000');
}

// Convert markdown to clean HTML using marked
const processedMd = cleanMath(md);
let contentHtml = marked.parse(processedMd);

// Enhance Assumption tags into badges
contentHtml = contentHtml.replace(
  /<strong>\[ASSUMPTION:\s*([A-Z0-9_]+)\]<\/strong>/g,
  '<span class="assumption-badge">ASSUMPTION: $1</span>'
);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gold Ledger — Technical Design Document</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 18mm 18mm 18mm;
      @bottom-right {
        content: counter(page);
      }
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 9.5pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* Document Header Card */
    .doc-header {
      border: 1px solid #cbd5e1;
      border-top: 4px solid #b45309;
      background: #f8fafc;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .doc-header h1 {
      margin: 0 0 4px 0;
      font-size: 19pt;
      color: #0f172a;
      letter-spacing: -0.02em;
      border: none;
      padding: 0;
    }

    .doc-header .doc-subtitle {
      font-size: 10.5pt;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 2px;
    }

    .meta-value {
      font-weight: 600;
      color: #0f172a;
    }

    .meta-value a {
      color: #1d4ed8;
      text-decoration: none;
      word-break: break-all;
    }

    .status-pill {
      display: inline-block;
      align-self: flex-start;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Headings */
    h1, h2, h3, h4 {
      color: #0f172a;
      font-weight: 700;
      page-break-after: avoid;
    }

    h2 {
      font-size: 13pt;
      margin-top: 18pt;
      margin-bottom: 7pt;
      padding-bottom: 3pt;
      border-bottom: 1.5pt solid #e2e8f0;
      color: #0f172a;
    }

    h3 {
      font-size: 10.5pt;
      margin-top: 12pt;
      margin-bottom: 4pt;
      color: #1e293b;
    }

    p {
      margin-top: 0;
      margin-bottom: 7pt;
      color: #334155;
      text-align: justify;
    }

    ul, ol {
      margin-top: 2pt;
      margin-bottom: 7pt;
      padding-left: 20px;
      color: #334155;
    }

    li {
      margin-bottom: 3pt;
      line-height: 1.45;
    }

    /* Code & ASCII Art */
    code {
      font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1.5px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    pre {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 10px 14px;
      overflow-x: auto;
      font-size: 8pt;
      line-height: 1.4;
      page-break-inside: avoid;
      margin: 8pt 0;
    }

    pre code {
      background: transparent;
      border: none;
      padding: 0;
      color: #1e293b;
      font-weight: 500;
    }

    /* Callout & Math styling */
    blockquote {
      margin: 8pt 0;
      padding: 6pt 12pt;
      border-left: 3.5px solid #b45309;
      background: #fffbeb;
      color: #92400e;
      border-radius: 0 4px 4px 0;
      font-size: 9pt;
    }

    .math-block {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 3.5px solid #2563eb;
      border-radius: 4px;
      padding: 7pt 12pt;
      margin: 7pt 0;
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 10pt;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 12px;
      page-break-inside: avoid;
    }

    .math-sym {
      font-size: 13pt;
      font-weight: bold;
    }

    .math-note {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 7.5pt;
      color: #64748b;
      margin-left: auto;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .math-inline {
      font-family: "Georgia", "Times New Roman", serif;
      font-style: italic;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 1px 4px;
      font-size: 8.5pt;
      color: #0f172a;
    }

    .math-frac {
      display: inline-flex;
      flex-direction: column;
      vertical-align: middle;
      text-align: center;
      font-size: 8.5pt;
      margin: 0 4px;
    }

    .math-num {
      border-bottom: 1px solid #0f172a;
      padding-bottom: 1px;
    }

    .math-den {
      padding-top: 1px;
    }

    .assumption-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: Consolas, monospace;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.03em;
      margin-right: 4px;
      vertical-align: middle;
    }

    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 14pt 0;
    }

    /* Print specific optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Clean Corporate Header -->
  <div class="doc-header">
    <h1>Gold Ledger</h1>
    <div class="doc-subtitle">Technical Design Document &amp; Architecture Specification</div>
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Client &amp; Scope</span>
        <span class="meta-value">Company A, Coimbatore (Sullivan St. Workshop, 5 Showrooms)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Deployment Status</span>
        <span class="status-pill">Production Deployed &amp; Verified</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Live Deployed URL</span>
        <span class="meta-value"><a href="https://goldleger.vercel.app/" target="_blank">https://goldleger.vercel.app/</a></span>
      </div>
      <div class="meta-item">
        <span class="meta-label">GitHub Repository</span>
        <span class="meta-value"><a href="https://github.com/aggisanjay/Gold-Leger" target="_blank">https://github.com/aggisanjay/Gold-Leger</a></span>
      </div>
    </div>
  </div>

  <!-- Body Content -->
  ${contentHtml}
</body>
</html>`;

writeFileSync("Technical_Design_Document.html", fullHtml);
console.log("Wrote beautifully styled Technical_Design_Document.html");

const htmlPath = path.resolve("Technical_Design_Document.html");
const pdfPath = path.resolve("Technical_Design_Document.pdf");
const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
console.log("Generating high-fidelity Technical_Design_Document.pdf via Edge headless...");
execSync(`"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${fileUrl}"`);
console.log("Generated Technical_Design_Document.pdf successfully!");

console.log("Packaging submission.zip with Technical_Design_Document.pdf and DEPLOYMENT.md...");
try {
  const deploymentPath = path.resolve("DEPLOYMENT.md");
  const zipPath = path.resolve("submission.zip");
  execSync(`powershell -Command "Compress-Archive -Path '${pdfPath}', '${deploymentPath}' -DestinationPath '${zipPath}' -Force"`);
  console.log("submission.zip packaged successfully!");
} catch (e) {
  console.warn("Could not create zip automatically:", e.message);
}
