/**
 * 简易 Markdown 渲染工具
 * 目前仅支持 **粗体** 语法，使用 dangerouslySetInnerHTML 渲染
 * 先转义 HTML 特殊字符防 XSS，再替换 **...** 为 <strong>...</strong>
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 把 **粗体** 文本渲染为 <strong>，同时做 XSS 防护
 * 只支持最简单的 **bold** 语法，不支持嵌套
 */
export function renderSimpleMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  // 将 **text** 替换为 <strong>text</strong>
  // 使用非贪婪匹配，且不跨行（单行内匹配）
  return escaped.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
}
