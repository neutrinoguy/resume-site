// Vercel Routing Middleware (Runs globally on Vercel Edge network)

const MARKDOWN_404 = `# 404 Not Found

The requested resource could not be found on this server.

### Available Manifests & Direct Resources:
- [Home & Portfolio](https://neutrinoguy.zip/)
- [Agent Manifest (llms.txt)](https://neutrinoguy.zip/llms.txt)
- [Agent Instructions & When-To-Use](https://neutrinoguy.zip/agent-instructions.md)
- [Full Context Dossier (llms-full.txt)](https://neutrinoguy.zip/llms-full.txt)
- [Sitemap](https://neutrinoguy.zip/sitemap.xml)
- [Full Resume (Markdown)](https://neutrinoguy.zip/Resume.md)
- [About Aagam Shah](https://neutrinoguy.zip/about)
- [Contact & CVD Guidelines](https://neutrinoguy.zip/contact)
- [Privacy Policy](https://neutrinoguy.zip/privacy)
`;

export const config = {
  matcher: [
    // Intercept requests except static media assets
    '/((?!assets/|_vercel/|favicon.ico).*)',
  ],
};

export default function middleware(request) {
  const accept = request.headers.get('accept') || '';

  // Only intercept if the client explicitly prefers/requests markdown
  if (accept.includes('text/markdown')) {
    const url = new URL(request.url);
    const cleanPath = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

    // If client is already requesting a direct text or pdf file, let static routing handle it
    if (
      cleanPath === 'llms.txt' ||
      cleanPath === 'llms-full.txt' ||
      cleanPath === 'resume.md' ||
      cleanPath === 'robots.txt' ||
      cleanPath === 'sitemap.xml' ||
      cleanPath === 'agent-instructions.md' ||
      cleanPath.endsWith('.pdf') ||
      cleanPath.endsWith('.png') ||
      cleanPath.endsWith('.ico')
    ) {
      return;
    }

    // Rewrite to our API handler which dynamically loads and responds with markdown
    url.pathname = '/api/agent';
    url.searchParams.set('path', cleanPath);
    return Response.rewrite(url);
  }

  // For standard browser HTML requests, continue normally
}
