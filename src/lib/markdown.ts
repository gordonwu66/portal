// Simple markdown to HTML converter
export function markdownToHtml(md: string): string {
  if (!md) return '';
  
  let html = md;
  
  // Escape HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="bg-neutral-100 dark:bg-neutral-800/70 rounded-md p-4 overflow-x-auto text-sm font-mono text-neutral-700 dark:text-neutral-300 my-3"><code>${code.trim()}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-100 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded text-[0.8125rem] font-mono">$1</code>');
  
  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-5 mb-2">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-5 mb-2">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-5 mb-2">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-6 mb-2">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mt-6 mb-3 tracking-tight">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mt-6 mb-3 tracking-tight">$1</h1>');
  
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="border-neutral-200/50 dark:border-neutral-700/50 my-6" />');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-semibold text-neutral-800 dark:text-neutral-200"><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-neutral-800 dark:text-neutral-200">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del class="text-neutral-400 dark:text-neutral-500">$1</del>');
  
  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-neutral-900 dark:text-neutral-100 underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-400" target="_blank" rel="noopener">$1</a>');
  
  // Images
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-md my-3" />');
  
  // Blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote class="border-l-2 border-neutral-200 dark:border-neutral-700 pl-4 text-neutral-500 dark:text-neutral-400 italic my-3">$1</blockquote>');
  
  // Unordered lists
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="text-neutral-900 dark:text-neutral-100 ml-4 list-disc">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>');
  
  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="text-neutral-900 dark:text-neutral-100 ml-4 list-decimal">$1</li>');
  
  // Checkboxes
  html = html.replace(/\[ \]/g, '<span class="inline-block w-3.5 h-3.5 border border-neutral-300 dark:border-neutral-600 rounded-sm mr-1.5 align-text-bottom"></span>');
  html = html.replace(/\[x\]/gi, '<span class="inline-block w-3.5 h-3.5 bg-neutral-800 dark:bg-neutral-300 rounded-sm mr-1.5 align-text-bottom text-white dark:text-neutral-900 text-[10px] leading-[14px] text-center">✓</span>');
  
  // Paragraphs
  html = html.replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="text-neutral-600 dark:text-neutral-400 leading-relaxed my-2">$1</p>');
  
  // Clean up empty lines
  html = html.replace(/\n{3,}/g, '\n\n');
  
  return html;
}
