/**
 * Minimal, dependency-free sanitizers for admin/CMS-controlled content that gets
 * injected via `dangerouslySetInnerHTML`.
 *
 * These are NOT a full HTML parser and are not a substitute for backend sanitization.
 * They are a pragmatic defense-in-depth layer that strips the most common XSS vectors
 * (inline <script>, event-handler attributes, `javascript:`/`data:` URLs, style-based
 * expression()/behavior tricks) so that if an admin account is compromised, or the
 * backend sanitization is ever bypassed, the frontend does not blindly execute
 * attacker-controlled markup.
 *
 * No external package (e.g. DOMPurify) is used here intentionally — this environment
 * has no network access to install new dependencies, so these are hand-rolled
 * regex/string based checks. Keep them conservative: prefer stripping too much over
 * allowing something dangerous through.
 */

/**
 * Strip <script>...</script> blocks (including malformed/unclosed ones), inline event
 * handler attributes (onclick=, onerror=, etc.), and javascript:/vbscript:/data: URLs
 * used in href/src/action attributes from a string of rich-text HTML.
 *
 * Intended for admin/CMS-authored rich text (page content, product descriptions,
 * landing page copy, video embed codes, etc.) rendered via dangerouslySetInnerHTML.
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let sanitized = html;

  // Remove <script>...</script> blocks entirely (case-insensitive, handles multi-line).
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  // Remove any stray/unclosed opening <script tags.
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, '');

  // Remove <object>, <embed>, <applet> tags (legacy plugin-execution vectors).
  sanitized = sanitized.replace(/<(object|embed|applet)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  sanitized = sanitized.replace(/<(object|embed|applet)\b[^>]*\/?>/gi, '');

  // Remove <link> and <meta> tags (can be used for refresh-redirects or resource injection).
  sanitized = sanitized.replace(/<(link|meta)\b[^>]*\/?>/gi, '');

  // Strip on*="..." / on*='...' / on*=unquoted event handler attributes, e.g. onclick, onerror, onload.
  sanitized = sanitized.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');

  // Neutralize javascript:/vbscript:/data: URLs in href/src/action/formaction attributes.
  sanitized = sanitized.replace(
    /\s(href|src|action|formaction)\s*=\s*"(\s*(?:javascript|vbscript)\s*:[^"]*)"/gi,
    ' $1="#blocked:$2"'
  );
  sanitized = sanitized.replace(
    /\s(href|src|action|formaction)\s*=\s*'(\s*(?:javascript|vbscript)\s*:[^']*)'/gi,
    " $1='#blocked:$2'"
  );
  sanitized = sanitized.replace(
    /\s(href|src|action|formaction)\s*=\s*(?!["'])\s*(javascript|vbscript)\s*:[^\s>]*/gi,
    ' $1="#blocked"'
  );

  // Strip <base> tags (can hijack all relative URLs on the page).
  sanitized = sanitized.replace(/<base\b[^>]*\/?>/gi, '');

  // Neutralize style attributes containing expression()/javascript:/behavior: tricks (old IE vectors,
  // still worth stripping defensively).
  sanitized = sanitized.replace(
    /\sstyle\s*=\s*"([^"]*)"/gi,
    (match, styleValue: string) => {
      if (/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:/i.test(styleValue)) {
        return '';
      }
      return match;
    }
  );

  return sanitized;
};

/**
 * Strip anything that isn't plain CSS from an admin-supplied `custom_css` string before
 * it is injected into a <style> tag. A <style> tag is not supposed to contain HTML/JS,
 * but if the value can break out of the tag (e.g. `</style><script>...`) or pull in
 * dangerous rules (expression(), javascript: bindings, remote @import), it should be
 * stripped/rejected.
 */
export const sanitizeCss = (css: string | null | undefined): string => {
  if (!css || typeof css !== 'string') {
    return '';
  }

  let sanitized = css;

  // Reject anything attempting to close the <style> tag and inject new markup.
  sanitized = sanitized.replace(/<\/\s*style\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\s*style\b[^>]*>/gi, '');

  // Strip any embedded <script> tags outright.
  sanitized = sanitized.replace(/<\s*\/?\s*script\b[^>]*>/gi, '');

  // Strip any other HTML tags that might sneak in (a <style> block should be pure CSS).
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Strip CSS expression() (old IE JS-in-CSS vector).
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');

  // Strip javascript:/vbscript: URLs used inside url(...) or elsewhere.
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/vbscript\s*:/gi, '');

  // Strip @import rules (can pull in external stylesheets/resources we don't control).
  sanitized = sanitized.replace(/@import\s+[^;]*;?/gi, '');

  // Strip -moz-binding / behavior (legacy XBL/HTC script-binding vectors).
  sanitized = sanitized.replace(/-moz-binding\s*:[^;}]*;?/gi, '');
  sanitized = sanitized.replace(/behavior\s*:[^;}]*;?/gi, '');

  return sanitized;
};
