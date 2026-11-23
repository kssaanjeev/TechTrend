from datetime import date, timedelta
import calendar
from backend.ingestion.feed_manager import get_processed_articles
from .keyword_analysis import extract_keywords_from_articles
def subtract_months(current_date, months):
    month = current_date.month - months
    year = current_date.year
    while month <= 0:
        month += 12
        year -= 1
    day = min(
        current_date.day,
        calendar.monthrange(year, month)[1]
    )
    return date(year, month, day)
def calculate_keyword_frequency(articles):
    today = date.today()
    periods = {
        "Last 7 Days": today - timedelta(days=6),
        "Last 30 Days": today - timedelta(days=29),
        "Last 3 Months": subtract_months(today, 3),
        "All Time": None
    }
    frequency_results = {
        period: {}
        for period in periods
    }
    for article in articles:
        article_date = article.get("date")
        try:
            article_date = date.fromisoformat(str(article_date))
        except (ValueError, TypeError):
            continue
        if article_date > today:
            continue
        keywords = article.get("keywords", {})
        for period, start_date in periods.items():
            if start_date is None or article_date >= start_date:
                for keyword, count in keywords.items():
                    frequency_results[period][keyword] = (
                        frequency_results[period].get(keyword, 0)
                        + count
                    )
    return frequency_results
if __name__ == "__main__":
    articles = get_processed_articles()
    for article in articles:
        print(article.get("title"), article.get("date"))
    processed_articles = extract_keywords_from_articles(articles)
    results = calculate_keyword_frequency(processed_articles)
    print("\n========== KEYWORD FREQUENCY ANALYSIS ==========\n")
    for period, keywords in results.items():
        print(f"\n{period}:")
        if keywords:
            sorted_keywords = sorted(
                keywords.items(),
                key=lambda item: item[1],
                reverse=True
            )
            for keyword, count in sorted_keywords:
                print(f"  {keyword} -> {count}")
        else:
            print("  No keywords found.")