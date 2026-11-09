import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const md = readFileSync("TECHNICAL_DESIGN.md", "utf8");

// Convert markdown to clean HTML
function mdToHtml(markdown) {
  let html = markdown
    // Escape HTML
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/gm, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr/>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Wrap paragraphs
  const lines = html.split(/\n\n+/);
  html = lines.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<hr') || block.startsWith('<blockquote') || block.startsWith('<ul') || block.startsWith('<ol')) {
      return block;
    }
    if (block.startsWith('- ')) {
      const items = block.split(/\n- /).map(li => `<li>${li.replace(/^- /, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    if (/^\d+\. /.test(block)) {
      const items = block.split(/\n\d+\. /).map(li => `<li>${li.replace(/^\d+\. /, '')}</li>`).join('');
      return `<ol>${items}</ol>`;
    }
    return `<p>${block}</p>`;
  }).join('\n');

  return html;
}

const bodyHtml = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gold Ledger — Technical Design Document</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #14161a;
      line-height: 1.6;
      font-size: 11pt;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 24pt;
      border-bottom: 2px solid #14161a;
      padding-bottom: 8px;
      margin-top: 0;
      color: #14161a;
    }
    h2 {
      font-size: 16pt;
      border-bottom: 1px solid #e4e6ea;
      padding-bottom: 6px;
      margin-top: 24pt;
      color: #14161a;
      page-break-after: avoid;
    }
    h3 {
      font-size: 13pt;
      margin-top: 16pt;
      color: #3b414c;
      page-break-after: avoid;
    }
    p, li {
      color: #2b303a;
    }
    code {
      font-family: "IBM Plex Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 9.5pt;
      background: #f5f6f7;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e4e6ea;
    }
    pre {
      background: #f5f6f7;
      border: 1px solid #e4e6ea;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-size: 9pt;
      line-height: 1.45;
      page-break-inside: avoid;
    }
    pre code {
      background: none;
      border: none;
      padding: 0;
    }
    hr {
      border: none;
      border-top: 1px solid #e4e6ea;
      margin: 20pt 0;
    }
    ul, ol {
      padding-left: 24px;
    }
    li {
      margin-bottom: 4px;
    }
    strong {
      color: #14161a;
      font-weight: 600;
    }
    blockquote {
      margin: 12pt 0;
      padding: 8pt 16pt;
      border-left: 4px solid #c9a227;
      background: #faf7ef;
      color: #646c79;
    }
    a {
      color: #2f4ea2;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 8.5pt;
      font-weight: 600;
      border-radius: 4px;
      background: #f8f1dc;
      color: #8f6f12;
      border: 1px solid #c9a227;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

writeFileSync("Technical_Design_Document.html", fullHtml);
console.log("Wrote Technical_Design_Document.html");

const htmlPath = path.resolve("Technical_Design_Document.html");
const pdfPath = path.resolve("Technical_Design_Document.pdf");
const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
console.log("Generating Technical_Design_Document.pdf via Edge headless...");
execSync(`"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${fileUrl}"`);
console.log("Generated Technical_Design_Document.pdf successfully!");

console.log("Packaging submission.zip with Technical_Design_Document.pdf and DEPLOYMENT.md...");
try {
  const deploymentPath = path.resolve("DEPLOYMENT.md");
  const zipPath = path.resolve("submission.zip");
  execSync(`powershell -Command "Compress-Archive -Path '${pdfPath}', '${deploymentPath}' -DestinationPath '${zipPath}' -Force"`);
  console.log("submission.zip created successfully!");
} catch (e) {
  console.warn("Could not create zip automatically:", e.message);
}
