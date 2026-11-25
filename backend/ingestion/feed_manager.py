
from .collector import load_and_clean_articles
from .categorizer import categorize_articles
from .feed_service import get_saved_feed_articles


def get_processed_articles():
    # 1. Collect existing local and live arXiv articles
    raw_articles = load_and_clean_articles()

    # 2. Load articles fetched from user-added feeds
    custom_feed_articles = get_saved_feed_articles()

    # 3. Combine both datasets
    combined_articles = raw_articles + custom_feed_articles

    # 4. Remove duplicate articles using their IDs
    unique_articles = {}
    for article in combined_articles:
        article_id = article.get("id")

        if article_id:
            unique_articles[article_id] = article

    # 5. Categorize the combined dataset
    categorized_articles = categorize_articles(
        list(unique_articles.values())
    )

    return categorized_articles


def get_feed_status():
    articles = get_processed_articles()

    source_counts = {}

    for article in articles:
        venue = article.get("venue", "General")
        source_counts[venue] = source_counts.get(venue, 0) + 1

    feeds = []

    for venue, count in source_counts.items():
        feeds.append({
            "source": venue,
            "status": "Active",
            "articleCount": count
        })

    return {
        "totalArticles": len(articles),
        "activeFeedsCount": len(feeds),
        "feeds": feeds
    }
