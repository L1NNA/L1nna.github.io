#!/usr/bin/env python3
"""Rebuild the publication list in index.html from OpenAlex.

Corrections live in scripts/publications.json: "add" for papers OpenAlex misses,
"hide" for papers that should not appear, and "venues" to replace a poor venue name.
"""
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

AUTHOR = "A5007693994"  # Steven H. H. Ding on OpenAlex (ORCID 0000-0003-4513-200X)
URL = (
    f"https://api.openalex.org/works?filter=author.id:{AUTHOR}&per-page=200"
    "&sort=publication_date:desc&select=title,publication_year,publication_date,type,primary_location,doi"
)
RECENT = 10  # Shown before the "All publications" toggle.
MINIMUM = 20  # Fewer results than this means something went wrong upstream.

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "index.html"
CONFIG = ROOT / "scripts" / "publications.json"
START = "<!-- publications:start -->"
END = "<!-- publications:end -->"


def key(title):
    return re.sub(r"[^a-z0-9]", "", title.lower())


def fetch():
    request = urllib.request.Request(URL, headers={"User-Agent": "L1NNA-website-publications"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)["results"]


def refereed(work):
    """Keep published papers; drop preprints, repository copies, theses and datasets."""
    source = (work.get("primary_location") or {}).get("source") or {}
    return (
        work.get("type") in ("article", "conference-paper")
        and source.get("type") in ("journal", "conference", "book series")
        and work.get("title")
    )


def collect(works, config):
    hidden = {key(title) for title in config["hide"]}
    fixes = {key(title): venue for title, venue in config["venues"].items()}
    papers = {}
    for work in filter(refereed, works):
        title = re.sub(r"<[^>]+>", "", work["title"]).strip()
        if key(title) in hidden:
            continue
        doi = work.get("doi") or ""
        papers.setdefault(key(title), {
            "title": title,
            "venue": fixes.get(key(title), work["primary_location"]["source"]["display_name"]),
            "year": work["publication_year"],
            "date": work.get("publication_date") or str(work["publication_year"]),
            "doi": doi if doi.startswith("https://doi.org/") else "",
        })
    for paper in config["add"]:
        papers[key(paper["title"])] = {"date": str(paper["year"]), "doi": "", **paper}
    return sorted(papers.values(), key=lambda paper: paper["date"], reverse=True)


def item(paper, indent):
    title = html.escape(paper["title"], quote=False)
    if paper["doi"]:
        title = f'<a href="{html.escape(paper["doi"])}">{title}</a>'
    venue = html.escape(f'{paper["venue"]}, {paper["year"]}', quote=False)
    return (
        f"{indent}<li>\n{indent}  <cite>{title}</cite>\n"
        f"{indent}  <span>{venue}</span>\n{indent}</li>"
    )


def render(papers):
    recent = "\n".join(item(paper, " " * 10) for paper in papers[:RECENT])
    older = "\n".join(item(paper, " " * 12) for paper in papers[RECENT:])
    return f"""{START}
        <ul class="pubs">
{recent}
        </ul>
        <details class="all">
          <summary>All publications ({len(papers)})</summary>
          <ul class="pubs">
{older}
          </ul>
        </details>
        {END}"""


def main():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    papers = collect(fetch(), config)
    if len(papers) < MINIMUM:
        sys.exit(f"Only {len(papers)} papers found; leaving the page unchanged.")
    page = PAGE.read_text(encoding="utf-8")
    updated, count = re.subn(
        re.escape(START) + r".*?" + re.escape(END),
        lambda _: render(papers),
        page,
        flags=re.S,
    )
    if count != 1:
        sys.exit("Publication markers not found in index.html.")
    PAGE.write_text(updated, encoding="utf-8")
    print(f"{len(papers)} papers")


if __name__ == "__main__":
    main()
