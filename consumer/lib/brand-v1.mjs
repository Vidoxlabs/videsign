/**
 * Brand v1 canon for the site, named by token.
 *
 * Values are hand-typed. TODO: re-sync from videsign once that change merges,
 * then delete the global.css persona override block in the same change.
 * Status colours are listed so a persona edit cannot be confused with them.
 * An unset or empty entry is denied.
 */

export const BRAND_CANON = Object.freeze({
  "brand-signature-violet": "#8B5CF6",
  "brand-signature-wisteria": "#B4A7F2",
  "brand-signature-xylia": "#D92B3A",
  "brand-signature-yarrow": "#F0A020",
  "brand-signature-zinnia": "#E13D9E",
  "brand-field-dark": "#121214",
  "brand-field-light": "#F7F7F5",
  "ambient-glow-wisteria-base": "rgba(180, 167, 242, 0.14)",
  "status-indicator-error-base": "#F43F5E",
  "status-indicator-warning-base": "#F59E0B",
});

const REQUIRED_CANON_TOKENS = Object.freeze(Object.keys(BRAND_CANON));

/**
 * @param {unknown} canon
 * @returns {typeof BRAND_CANON}
 */
export function assertBrandCanon(canon) {
  if (canon == null || typeof canon !== "object") {
    throw new Error("brand canon denied: unset");
  }
  const record = /** @type {Record<string, unknown>} */ (canon);
  for (const name of REQUIRED_CANON_TOKENS) {
    const value = record[name];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`brand canon denied: ${name} unset`);
    }
  }
  return /** @type {typeof BRAND_CANON} */ (canon);
}

/** Brand rules appended to the ViDesign preflight. Values come from the canon. */
export function brandPreflightSection() {
  const canon = assertBrandCanon(BRAND_CANON);
  return `## Brand (v1)

Brand files come only from the brand v1 set. Items 7 and 10 are Accepted (2026-10-28). Items 1-6, 8 and 9 stay proposed. The Drive folder is \`design_system/brand/\` by path name, mirrored in \`Vidoxlabs/videsign\` under \`brand/\`. Every brand file needs a provenance record and a digest test. Never draw, recolour, or approximate the mark. Xylia is never text and never appears alone. The wordmark is one colour. CTA fills and focus outlines use \`--accent\`, the synced surface-accent-violet-base (\`#8B5CF6\`). Hover is \`#6D28D9\` and active is \`#5B21B6\`. Accepted 2026-10-28. Violet \`${canon["brand-signature-violet"]}\` is the persona and signature colour for fills and icons. Labels on that violet use white \`--text-on-accent\` at 4.23:1, large or bold labels only (bold xl or larger, or 2xl or larger). Accepted 2026-10-28. Normal-size buttons use \`--accent\` as a border with the existing light text on the dark surface. No new colour. Signature colours: Violet \`${canon["brand-signature-violet"]}\`, Wisteria \`${canon["brand-signature-wisteria"]}\`, Xylia \`${canon["brand-signature-xylia"]}\`, Yarrow \`${canon["brand-signature-yarrow"]}\`, Zinnia \`${canon["brand-signature-zinnia"]}\`. Field dark \`${canon["brand-field-dark"]}\` and field light \`${canon["brand-field-light"]}\`. Status error \`${canon["status-indicator-error-base"]}\` and status warning \`${canon["status-indicator-warning-base"]}\` stay status tokens. V-shield is proposed for retirement, along with teal \`#2DD4BF\`, rose \`#F43F5E\` as a persona colour, \`#7226FA\`, \`#A78BFA\`, the chevron favicon, \`cube.png\`, and Inter. The font is Geist.`;
}
