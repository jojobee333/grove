/**
 * Grove simple Markdown renderer.
 * Supports: h1-h4, bold, italic, inline code, fenced code blocks,
 *           links (external + internal), unordered lists, GFM tables, paragraphs.
 * Pure function — no DOM, no side effects.
 *
 * @param {string} md - Markdown source
 * @returns {string} HTML string
 */
export function simpleMarkdown(md) {
  md = md.replace(/\r\n/g, '\n');

  const blocks = [];

  // Extract fenced code blocks before any other transform
  md = md.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    const html = '<pre><code>' +
      code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</code></pre>';
    blocks.push(html);
    return `\x00BLOCK${blocks.length - 1}\x00`;
  });

  // Extract GFM tables before inline transforms corrupt pipe characters
  md = md.replace(/(\|[^\n]+\|\n\|[ \t|:\-]+\|\n(?:\|[^\n]+\|\n?)+)/g, tableBlock => {
    const lines   = tableBlock.trim().split('\n');
    const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
    const rows    = lines.slice(2).map(row => row.split('|').slice(1, -1).map(c => c.trim()));
    const thead   = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const tbody   = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
    blocks.push(`<table class="md-table">${thead}${tbody}</table>`);
    return `\x00BLOCK${blocks.length - 1}\x00`;
  });

  md = md
    .replace(/^#{4} (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const external = /^https?:\/\//.test(url);
      return `<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, s => '<ul>' + s + '</ul>')
    .replace(/^(?!<[hul\x00]|\s*$)(.+)$/gm, '<p>$1</p>')
    .replace(/\n{3,}/g, '\n\n');

  return md.replace(/\x00BLOCK(\d+)\x00/g, (_, i) => blocks[+i]);
}
