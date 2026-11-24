
import hashlib
import json
import ipaddress
import socket
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


# Project data paths
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
FEEDS_FILE = DATA_DIR / "feeds.json"
ARTICLES_FILE = DATA_DIR / "feed_articles.json"

MAX_RESPONSE_SIZE = 5 * 1024 * 1024
REQUEST_TIMEOUT = 10


def _load_json(path, default):
    if not path.exists():
        return default

    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, OSError):
        return default


def _save_json(path, data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    temporary_path = path.with_suffix(".tmp")

    with open(temporary_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

    temporary_path.replace(path)


def get_feeds():
    return _load_json(FEEDS_FILE, [])


def get_saved_feed_articles():
    return _load_json(ARTICLES_FILE, [])


def _validate_url(url):
    parsed = urllib.parse.urlparse(url)

    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("Enter a valid HTTP or HTTPS URL.")

    hostname = parsed.hostname.lower()

    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Localhost URLs are not allowed.")

    try:
        addresses = socket.getaddrinfo(hostname, None)

        for address in addresses:
            ip = ipaddress.ip_address(address[4][0])

            if not ip.is_global:
                raise ValueError("Private or local network URLs are not allowed.")

    except socket.gaierror:
        raise ValueError("The feed hostname could not be resolved.")


def _fetch_url(url):
    _validate_url(url)

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "TechTrend/1.0"}
    )

    with urllib.request.urlopen(
        request,
        timeout=REQUEST_TIMEOUT
    ) as response:

        content = response.read(MAX_RESPONSE_SIZE + 1)

        if len(content) > MAX_RESPONSE_SIZE:
            raise ValueError("Feed response is too large (maximum 5 MB).")

        return content


def _local_name(tag):
    return tag.split("}")[-1].lower()


def _child_text(element, names):
    for child in element:
        if _local_name(child.tag) in names:
            return "".join(child.itertext()).strip()

    return ""


def _parse_date(value):
    if not value:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        ).strftime("%Y-%m-%d")
    except ValueError:
        pass

    try:
        return parsedate_to_datetime(value).strftime("%Y-%m-%d")
    except (TypeError, ValueError):
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _make_article(feed, title, text, url, author, date):
    identity = url or title

    article_id = hashlib.sha256(
        f"{feed['id']}:{identity}".encode("utf-8")
    ).hexdigest()[:20]

    return {
        "id": f"feed-{article_id}",
        "feedId": feed["id"],
        "title": title or "Untitled Article",
        "authors": author or "Unknown",
        "venue": feed["name"],
        "sourceType": feed["type"],
        "date": _parse_date(date),
        "url": url,
        "text": text
    }


def _parse_xml(content, feed):
    root = ET.fromstring(content)
    articles = []

    for element in root.iter():
        if _local_name(element.tag) not in ("item", "entry"):
            continue

        title = _child_text(element, {"title"})
        description = _child_text(
            element, {"description", "summary", "content", "encoded"}
        )

        author = _child_text(element, {"author", "creator", "name"})
        date = _child_text(
            element, {"pubdate", "published", "updated", "date"}
        )

        link = ""

        for child in element:
            if _local_name(child.tag) == "link":
                link = child.attrib.get("href") or (child.text or "").strip()
                if link:
                    break

        if title:
            articles.append(
                _make_article(feed, title, description, link, author, date)
            )

    return articles


def _parse_json(content, feed):
    data = json.loads(content.decode("utf-8-sig"))

    if isinstance(data, list):
        records = data

    elif isinstance(data, dict):
        records = None

        for key in ("articles", "items", "data", "results", "entries"):
            value = data.get(key)

            if isinstance(value, list):
                records = value
                break

        if records is None:
            raise ValueError(
                "Unsupported JSON format. Expected an article list "
                "or an articles/items/data/results array."
            )
    else:
        raise ValueError("Unsupported JSON response.")

    articles = []

    for item in records:
        if not isinstance(item, dict):
            continue

        title = (
            item.get("title")
            or item.get("headline")
            or item.get("name")
        )

        if not title:
            continue

        text = (
            item.get("description")
            or item.get("summary")
            or item.get("abstract")
            or item.get("content")
            or item.get("text")
            or ""
        )

        url = item.get("url") or item.get("link") or ""

        author = item.get("author") or item.get("authors") or "Unknown"

        if isinstance(author, list):
            author = ", ".join(str(value) for value in author)

        date = (
            item.get("published")
            or item.get("publishedAt")
            or item.get("date")
            or item.get("created_at")
            or ""
        )

        articles.append(
            _make_article(feed, str(title), str(text), str(url),
                          str(author), str(date))
        )

    return articles


def fetch_feed_articles(feed):
    content = _fetch_url(feed["endpoint"])

    # Automatically detect XML or JSON.
    content_start = content.lstrip()[:1]

    if content_start in (b"<",):
        articles = _parse_xml(content, feed)
    elif content_start in (b"{", b"["):
        articles = _parse_json(content, feed)
    else:
        raise ValueError("Unsupported response. Expected RSS, Atom or JSON.")

    return articles


def test_feed(name, feed_type, endpoint):
    temporary_feed = {
        "id": "test-feed",
        "name": name,
        "type": feed_type,
        "endpoint": endpoint
    }

    articles = fetch_feed_articles(temporary_feed)

    return {
        "success": True,
        "articleCount": len(articles),
        "articles": articles
    }


def add_feed(name, feed_type, endpoint):
    feed_id = hashlib.sha256(
        endpoint.encode("utf-8")
    ).hexdigest()[:16]

    feed = {
        "id": feed_id,
        "name": name,
        "type": feed_type,
        "endpoint": endpoint,
        "active": True,
        "interval": "Manual",
        "lastSync": None,
        "count": 0,
        "status": "Testing",
        "lastError": None
    }

    # Fetch real data before registering the feed.
    articles = fetch_feed_articles(feed)

    feed["count"] = len(articles)
    feed["lastSync"] = datetime.now(timezone.utc).isoformat()
    feed["status"] = "Active"

    feeds = get_feeds()
    feeds = [item for item in feeds if item["id"] != feed_id]
    feeds.append(feed)

    existing_articles = get_saved_feed_articles()
    article_map = {item["id"]: item for item in existing_articles}

    for article in articles:
        article_map[article["id"]] = article

    _save_json(FEEDS_FILE, feeds)
    _save_json(ARTICLES_FILE, list(article_map.values()))

    return feed


def sync_all_feeds():
    feeds = get_feeds()
    saved_articles = get_saved_feed_articles()

    article_map = {item["id"]: item for item in saved_articles}
    results = []

    for feed in feeds:
        if not feed.get("active"):
            continue

        try:
            articles = fetch_feed_articles(feed)

            for article in articles:
                article_map[article["id"]] = article

            feed["count"] = len(articles)
            feed["lastSync"] = datetime.now(timezone.utc).isoformat()
            feed["status"] = "Active"
            feed["lastError"] = None

            results.append({
                "id": feed["id"],
                "success": True,
                "articleCount": len(articles)
            })

        except Exception as error:
            feed["status"] = "Failed"
            feed["lastError"] = str(error)

            results.append({
                "id": feed["id"],
                "success": False,
                "error": str(error)
            })

    _save_json(FEEDS_FILE, feeds)
    _save_json(ARTICLES_FILE, list(article_map.values()))

    return results


def update_feed_status(feed_id, active):
    feeds = get_feeds()
    updated_feed = None

    for feed in feeds:
        if feed["id"] == feed_id:
            feed["active"] = bool(active)
            feed["status"] = "Active" if active else "Paused"
            updated_feed = feed
            break

    _save_json(FEEDS_FILE, feeds)
    return updated_feed


def delete_feed(feed_id):
    feeds = [
        feed for feed in get_feeds()
        if feed["id"] != feed_id
    ]

    articles = [
        article for article in get_saved_feed_articles()
        if article.get("feedId") != feed_id
    ]

    _save_json(FEEDS_FILE, feeds)
    _save_json(ARTICLES_FILE, articles)

    return True
