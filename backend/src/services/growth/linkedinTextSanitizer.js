/**
 * LinkedIn Caption Sanitizer & Human-Style Formatter
 *
 * Ensures every LinkedIn post published via the autonomous growth engine reads like
 * natural, human-written founder prose (no raw Markdown asterisks, no ChatGPT prompt
 * headings like "**Hook:**" or "- **Symptom:**", and no literal backslash escapes
 * like "\(2031\)" from LinkedIn Little Text collisions).
 */

const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.asmind.app';

// Template section labels that LLMs echo from prompt instructions
const STANDALONE_AI_HEADERS_RE = /^(?:[🔋💡🧠📌🚀🎯✨✍️⚡️🔍💬👉🪞📊🔥]+[\ufe0f\u200d]*\s*)?(?:\*{1,2}|__)?(?:Hook|The Hook|The Blind Spot|Blind Spot|Body|Problem|The Problem|Solution|The Solution|Why Advice Fails|Why Standard Advice Fails|Why Most Advice Fails|Closing CTA|Call to Action|CTA|Summary|Bottom Line|Conclusion)(?:\*{1,2}|__)?\s*:?\s*$/i;

const INLINE_AI_PREFIX_RE = /^((?:[-•*]\s*)?)(?:[🔋💡🧠📌🚀🎯✨✍️⚡️🔍💬👉🪞📊🔥]+[\ufe0f\u200d]*\s*)?(?:\*{1,2}|__)?(?:Hook|The Hook|The Blind Spot|Blind Spot|Symptom|Symptoms|Subconscious Trigger|Emotional Trigger|Root Cause|Trigger|Why Advice Fails|Why Standard Advice Fails|Why Most Advice Fails|Psychological Insight|Practical Framework|Natural Product Alignment|Closing CTA|Call to Action|CTA|Takeaway)(?:\*{1,2}|__)?:\s*(?:\*{1,2}|__)?/i;

/**
 * Unescapes LLM-emitted backslashes and replaces parentheticals/brackets outside URLs
 * with natural dashes or commas so LinkedIn neither truncates on '(' nor renders '\('.
 */
function normalizeNonUrlSegment(segment) {
    if (!segment) return segment;

    let out = segment
        // Unescape any backslash-escaped punctuation (e.g. \(2031\) -> (2031))
        .replace(/\\([()[\]{}*_\\])/g, '$1')
        // Remove "(link in first comment)" references since self-commenting is disabled
        .replace(/\s*\([^()\n]*\blink in (?:the )?(?:first )?comment\b[^()\n]*\)/gi, '')
        // Replace parentheticals with natural typography so LinkedIn Little Text never truncates or displays \(
        .replace(/\s*\(([^()\n]{1,140})\)/g, (match, inner, offset, fullStr) => {
            const trimmed = inner.trim();
            if (!trimmed) return '';
            const after = fullStr.slice(offset + match.length);
            if (!after || /^\s*(?:[,.:;!?]|$|\r|\n)/.test(after)) {
                return ` — ${trimmed}`;
            }
            return `, ${trimmed},`;
        })
        // Remove stray square brackets outside URLs (markdown links already handled below)
        .replace(/\[([^\]]+)\]/g, '$1');

    return out;
}

/**
 * Cleans an LLM-generated or raw LinkedIn caption into natural, human-readable UTF-8 prose.
 *
 * @param {string} rawText - Raw caption string
 * @param {Object} [options]
 * @param {boolean} [options.includeCaptionLink] - Enforce URL inclusion (true) or removal (false). Undefined leaves links untouched.
 * @param {string} [options.utmLink] - Tracked Google Play URL to use when includeCaptionLink is true.
 * @returns {string} Clean LinkedIn caption ready for publishing
 */
export function cleanLinkedInHumanCaption(rawText, options = {}) {
    if (!rawText || typeof rawText !== 'string') return '';

    const { includeCaptionLink, utmLink = DEFAULT_PLAY_STORE_URL } = options;

    let text = rawText.replace(/\r\n/g, '\n').trim();

    // Unescape Markdown links "[label](url)" -> "label: url" before stripping brackets
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1: $2');

    // Clean line by line: remove prompt scaffolding headers and markdown styling
    const rawLines = text.split('\n');
    const cleanedLines = [];

    for (let line of rawLines) {
        let cur = line;

        // Strip markdown ATX headers (`### Title` -> `Title`, leaving hashtags like `#TwinGenie` intact)
        cur = cur.replace(/^\s*#{1,6}\s+/, '');

        // Drop standalone AI template labels like "💡 **The Blind Spot:**"
        if (STANDALONE_AI_HEADERS_RE.test(cur.trim())) {
            continue;
        }

        // Strip inline AI template prefixes like "🔋 **Hook:** " or "- **Symptom:** "
        const prefixMatch = cur.match(INLINE_AI_PREFIX_RE);
        if (prefixMatch) {
            const bulletLead = prefixMatch[1] ? '• ' : '';
            cur = bulletLead + cur.slice(prefixMatch[0].length).trimStart();
        }

        // Convert Markdown list prefixes ("- item" or "* item") to Unicode bullet "• item"
        cur = cur.replace(/^\s*[-*]\s+/, '• ');

        // Remove stale "link in first comment" CTAs anywhere on a line
        cur = cur
            .replace(/\s*\(?\s*direct\s+link\s+in\s+(?:the\s+)?first\s+comment\.?\s*\)?/gi, '')
            .replace(/\s*\(?\s*link\s+in\s+(?:the\s+)?first\s+comment\.?\s*\)?/gi, '');

        // Strip Markdown bold, italic, and inline code syntax
        cur = cur
            .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
            .replace(/__([^_\n]+?)__/g, '$1')
            .replace(/`([^`\n]+?)`/g, '$1')
            .replace(/(^|\s)\*([^*\n]+?)\*(?=\s|[.,!?;:]|$)/g, '$1$2')
            .replace(/\*\*/g, '');

        // Transform parentheticals and stray escapes outside URLs
        const urlSplit = cur.split(/(https?:\/\/[^\s]+)/g);
        cur = urlSplit
            .map((part, idx) => (idx % 2 === 1 ? part : normalizeNonUrlSegment(part)))
            .join('');

        // Clean extra trailing/double spaces left after removals (preserve clean single spaces)
        cur = cur.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.:;!?])/g, '$1').trimEnd();

        // Skip lines that became just an empty bullet or solitary trailing colon
        if (/^[•-]\s*$/.test(cur.trim())) continue;

        cleanedLines.push(cur);
    }

    text = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Enforce link placement rule if explicitly requested
    if (includeCaptionLink === false) {
        // Remove all URLs cleanly and drop dangling empty CTA lines ending in ":"
        text = text
            .replace(/https?:\/\/[^\s]+/gi, '')
            .replace(/[^\n]*:\s*(?=\n|$)/g, (line) =>
                /(download|try|explore|start|install|reset|play store|twingenie)/i.test(line) ? '' : line
            )
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    } else if (includeCaptionLink === true && utmLink) {
        const barePlayUrlRe = /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.asmind\.app(?![^\s]*referrer=)/gi;
        text = text.replace(barePlayUrlRe, utmLink);

        if (!text.includes('play.google.com')) {
            const hashtagLineIdx = text.search(/\n+(?:#[A-Za-z0-9_]+)/);
            const ctaLine = `📲 Explore TwinGenie free on Google Play: ${utmLink}`;
            if (hashtagLineIdx !== -1) {
                text = `${text.slice(0, hashtagLineIdx).trimEnd()}\n\n${ctaLine}\n\n${text.slice(hashtagLineIdx).trimStart()}`;
            } else {
                text = `${text}\n\n${ctaLine}`;
            }
        }
    }

    return text.replace(/\n{3,}/g, '\n\n').trim();
}
