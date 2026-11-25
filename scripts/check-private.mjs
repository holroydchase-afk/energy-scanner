// Shared privacy scan for public repos: fails if a file git would commit holds personal data.
// Merges the forks in pm-tools, Role Radar and ccwatts. Plain Node, no dependencies.
//   node scripts/check-private.mjs [--staged]
// Finds: personal emails, phone numbers, claude.ai artifact links, scheduled-task ids, Gmail links,
// home paths, tokens and keys, any .env* file, and denylisted terms. Findings print as
// `file:line: kind: masked-match` (the real value is never echoed); exit 1 on any finding.
// Config: studio-checks.json (or $STUDIO_CHECKS), section "private":
//   { "private": { "allowUsers": ["demo"], "allowEmails": [], "skip": ["^fixtures/"],
//                  "extraPatterns": [{ "name": "project code", "pattern": "ZQX-[0-9]{4}" }] } }
// Private names live OUTSIDE the repo: PRIVATE_DENYLIST=/path/to/list.txt (one term per line, # comments).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_EMAILS = [
  /^[^@]*no-?reply@/i,
  /@anthropic\.com$/i,
  /@example\.(com|org|net)$/i,
  /@([a-z0-9-]+\.)*(example|test|invalid|localhost)$/i,
  /@users\.noreply\.github\.com$/i,
];

// [kind, regex, keep(match, config) -> true when the match is fine]. Patterns are split so this file
// does not contain the strings it hunts for.
const RULES = [
  ["email", /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}\b/g, (m, c) => {
    const e = m[0].toLowerCase();
    return (c.allowEmails ?? []).some((a) => a.toLowerCase() === e) || ALLOWED_EMAILS.some((r) => r.test(m[0]));
  }],
  ["phone number", /(?<![\d-])(?:\+1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?![\d-])/g],
  ["claude.ai artifact link", /claude\.ai\/(?:code\/)?artifact\/[A-Za-z0-9-]{8,}/g],
  ["scheduled task id", /\btrig_[A-Za-z0-9]{10,}/g],
  ["Gmail link", /mail\.google\.com\/mail\/u\/\d+\/#\w+\/[^"'`\s+)]+/g],
  ["home path", new RegExp("(?:(?<![\\w.-])/" + "(?:Users|home)/|C:\\\\{1,2}Users\\\\{1,2})([\\w.-]+)", "gi"),
    (m, c) => (c.allowUsers ?? []).some((u) => u.toLowerCase() === (m[1] ?? "").toLowerCase())],
  ["GitHub token", /\bgh[pousr]_\w{20,}|\bgithub_pat_\w+/g],
  ["npm token", /\bnpm_\w{36}/g],
  ["API secret key", /\bsk-(?:ant-)?[\w-]{20,}/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["Slack token", /\bxox[baprs]-[\w-]+/g],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
];

const DEFAULT_SKIP = /(^|\/)(node_modules\/|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$)|\.(png|gif|ico|jpe?g|webp|woff2?|ttf|otf|pdf|zip|gz)$/i;
const ENV_FILE = /(^|\/)\.env[^/]*$/;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mask = (s) => (s.length <= 4 ? "***" : s.slice(0, 3) + "***");
const maskEmail = (s) => {
  const i = s.lastIndexOf("@");
  return s.slice(0, Math.min(i, 3)) + "***" + s.slice(i);
};

/** Reads a denylist file: one term per line, blanks and # comments ignored, terms lowercased. Missing file gives []. */
export function loadDenylist(path) {
  if (!path || !existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith("#"));
}

/**
 * @param {string} text
 * @param {{allowUsers?: string[], allowEmails?: string[], extraPatterns?: {name: string, pattern: string, flags?: string}[], denylist?: string[]}} [config]
 * @returns {{kind: string, line: number, match: string}[]} matches are already masked
 */
export function scanText(text, config = {}) {
  const extra = (config.extraPatterns ?? []).map((p) => [p.name, new RegExp(p.pattern, (p.flags ?? "").replace(/g/g, "") + "g")]);
  const deny = (config.denylist ?? []).map((t) => [t, new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, "gi")]);
  const hits = [];
  text.split(/\r?\n/).forEach((src, i) => {
    const line = i + 1;
    for (const [kind, re, keep] of RULES) {
      for (const m of src.matchAll(re)) {
        if (keep?.(m, config)) continue;
        hits.push({ kind, line, match: kind === "email" ? maskEmail(m[0]) : mask(m[0]) });
      }
    }
    for (const [kind, re] of extra) for (const m of src.matchAll(re)) hits.push({ kind, line, match: mask(m[0]) });
    for (const [term, re] of deny) for (const _ of src.matchAll(re)) hits.push({ kind: "denylisted term", line, match: term.slice(0, 2) + "…" });
  });
  return hits;
}

function main(argv) {
  const staged = argv.includes("--staged");
  const git = (args, opts = {}) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"], ...opts });
  const top = git(["rev-parse", "--show-toplevel"]).trim();
  const configFile = resolve(top, process.env.STUDIO_CHECKS || "studio-checks.json");
  const cfg = existsSync(configFile) ? JSON.parse(readFileSync(configFile, "utf8")).private ?? {} : {};
  const config = { ...cfg, denylist: loadDenylist(process.env.PRIVATE_DENYLIST) };
  const skips = (cfg.skip ?? []).map((s) => new RegExp(s));
  const list = (...a) => git(a, { cwd: top }).split("\0").filter(Boolean);
  const paths = staged
    ? list("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
    : [...new Set([...list("ls-files", "-z"), ...list("ls-files", "-z", "--others", "--exclude-standard")])];

  const problems = [];
  for (const p of paths) {
    if (DEFAULT_SKIP.test(p) || skips.some((r) => r.test(p))) continue;
    if (ENV_FILE.test(p)) { problems.push(`${p}:1: env file: (keep it out of git)`); continue; }
    let buf;
    try { buf = staged ? git(["show", `:${p}`], { cwd: top, encoding: "buffer" }) : readFileSync(resolve(top, p)); } catch { continue; }
    if (buf.includes(0)) continue; // binary
    for (const h of scanText(buf.toString("utf8"), config)) problems.push(`${p}:${h.line}: ${h.kind}: ${h.match}`);
  }
  if (problems.length) {
    console.log(problems.join("\n"));
    console.error(`check-private: ${problems.length} problem(s). Use a placeholder, or allow it in studio-checks.json "private".`);
    return 1;
  }
  console.log("check-private: clean");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error("check-private: " + (e instanceof Error ? e.message : "failed")); process.exit(2); }
}
