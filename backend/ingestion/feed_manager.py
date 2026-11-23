from datetime import datetime
from .collector import load_and_clean_articles
from .categorizer import categorize_articles


def get_processed_articles():
    # Runs Task 1 (collect) + Task 2 (categorize) together
    raw_articles = load_and_clean_articles()
    categorized_articles = categorize_articles(raw_articles)
    return categorized_articles


def get_feed_status():
    articles = get_processed_articles()

    # Count how many articles came from each venue/source
    source_counts = {}
    for article in articles:
        venue = article.get("venue", "General")
        source_counts[venue] = source_counts.get(venue, 0) + 1

    feeds = []
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for venue, count in source_counts.items():
        feeds.append({
            "source": venue,
            "status": "Active",
            "lastSync": current_time,
            "articleCount": count
        })

    return {
        "totalArticles": len(articles),
        "activeFeedsCount": len(feeds),
        "feeds": feeds
    }


if __name__ == "__main__":
    all_articles = get_processed_articles()
    status_report = get_feed_status()

    print("Task 3 Complete! All 3 files are connected and working.")
    print(f"Total Ready Articles: {len(all_articles)}")
    print("Feed Status Report:", status_report)
