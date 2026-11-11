#!/usr/bin/env python3
"""Studio privacy scan (studio-agents templates/security).

Fails if a tracked file contains a personal email, a phone number, a claude.ai
artifact or session link, or a scheduled-trigger id. Public repos only show
sample data. To allow a known-safe match, add a regex (one per line, # for
comments) to .privacy-allow at the repo root; it is matched against the found
text. Usage: python3 .github/privacy-scan.py [repo dir]
"""
import re
import subprocess
import sys
from pathlib import Path

PATTERNS = [
    ("email address", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")),
    ("phone number", re.compile(r"(?<![\d-])(?:\+1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?![\d-])")),
    ("claude.ai link", re.compile(r"claude\.ai/(?:code/)?(?:artifact|session)s?/[A-Za-z0-9_-]{8,}")),
    ("trigger or environment id", re.compile(r"\b(?:trig|env)_[A-Za-z0-9]{10,}")),
]
# Placeholders and reserved names that are never personal data.
SAFE = [
    r"no-?reply@", r"@users\.noreply\.github\.com$", r"@anthropic\.com$",
    r"@example\.(?:com|org|net)$", r"\.(?:example|test|invalid|localhost)$",
    r"^(?:you|your|name|user|someone|me)@",
    r"\(?\d{3}\)?[ .-]555[ .-]01\d\d$",  # 555-0100..0199 are fictional
]
SKIP_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".woff", ".woff2",
                 ".ttf", ".pdf", ".zip", ".gz", ".lock", ".map")
SKIP_NAMES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "privacy-scan.py"}


def load_allow(root: Path):
    f = root / ".privacy-allow"
    if not f.exists():
        return []
    lines = [l.strip() for l in f.read_text().splitlines()]
    return [re.compile(l) for l in lines if l and not l.startswith("#")]


def scan(root: Path):
    allow = [re.compile(s, re.I) for s in SAFE] + load_allow(root)
    files = subprocess.run(["git", "-C", str(root), "ls-files", "-z"], capture_output=True,
                           text=True, check=True).stdout.split("\0")
    hits = []
    for name in filter(None, files):
        p = root / name
        if p.name in SKIP_NAMES or name.lower().endswith(SKIP_SUFFIXES) or not p.is_file():
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            for kind, rx in PATTERNS:
                for m in rx.finditer(line):
                    if not any(a.search(m.group(0)) for a in allow):
                        hits.append(f"{name}:{lineno}: {kind}: {m.group(0)}")
    return hits


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    found = scan(root)
    for h in found:
        print(h)
    if found:
        print(f"privacy-scan: {len(found)} match(es). Remove personal data, or allow a safe match in .privacy-allow.")
        sys.exit(1)
    print("privacy-scan: clean")
