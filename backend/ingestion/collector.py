import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

# Automatically finds data/articles.json from anywhere
DEFAULT_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "articles.json"


def load_local_articles(file_path=DEFAULT_DATA_PATH):
    with open(file_path, "r", encoding="utf-8") as file:
        raw_articles = json.load(file)

    clean_articles = []
    for item in raw_articles:
        clean_articles.append({
            "id": str(item.get("id", "unknown")),
            "title": item.get("title", "No Title"),
            "authors": item.get("authors", "Unknown"),
            "venue": item.get("venue", "General"),
            "sourceType": ("Tech News" 
                           if item.get("sourceType", "News") in ["News", "Tech News"]
                           else "Research Paper"
                        ),
            "date": item.get("date", "2026-01-01"),
            "url": item.get("url", ""),
            "text": item.get("text", ""),
        })
    return clean_articles


def fetch_arxiv_articles(query="artificial+intelligence", max_results=5):
    url = f"http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={max_results}"
    response = urllib.request.urlopen(url, timeout=10)
    xml_data = response.read()

    root = ET.fromstring(xml_data)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    arxiv_articles = []

    for entry in root.findall("atom:entry", ns):
        raw_id = entry.find("atom:id", ns).text.split("/abs/")[-1]
        title = entry.find("atom:title", ns).text.strip().replace("\n", " ")
        summary = entry.find("atom:summary", ns).text.strip().replace("\n", " ")
        published = entry.find("atom:published", ns).text[:10]
        link = entry.find("atom:id", ns).text

        authors_list = [
            author.find("atom:name", ns).text
            for author in entry.findall("atom:author", ns)
        ]

        arxiv_articles.append({
            "id": f"arxiv-{raw_id}",
            "title": title,
            "authors": ", ".join(authors_list),
            "venue": "arXiv",
            "sourceType": "Research Paper",
            "date": published,
            "url": link,
            "text": summary,
        })

    return arxiv_articles


def load_and_clean_articles(file_path=DEFAULT_DATA_PATH, include_live_arxiv=True):
    # 1. Always load your curated local JSON articles first
    articles = load_local_articles(file_path)

    # 2. Try fetching live research papers from arXiv API
    if include_live_arxiv:
        try:
            live_articles = fetch_arxiv_articles(query="artificial+intelligence", max_results=5)
            articles.extend(live_articles)
        except Exception as e:
            # Safe fallback: if offline or API fails, keep running smoothly with local JSON
            print(f"Warning: Live arXiv fetch skipped ({e}). Using local dataset only.")

    return articles


if __name__ == "__main__":
    all_data = load_and_clean_articles()
    print(f"Task 1 Complete! Loaded {len(all_data)} total articles (local + live arXiv).")
