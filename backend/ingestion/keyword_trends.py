from datetime import date
from feed_manager import get_processed_articles
from keyword_analysis import extract_keywords_from_articles
def generate_month_range(start_date, end_date):
    months = []
    year = start_date.year
    month = start_date.month
    while (year, month) <= (end_date.year, end_date.month):
        months.append(f"{year}-{month:02d}")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return months
def calculate_monthly_trends(articles):
    valid_articles = []
    for article in articles:
        try:
            article_date = date.fromisoformat(
                str(article.get("date"))
            )
        except (ValueError, TypeError):
            continue
        if article_date <= date.today():
            valid_articles.append((article, article_date))
    if not valid_articles:
        return {}
    dates = [item[1] for item in valid_articles]
    months = generate_month_range(
        min(dates),
        max(dates)
    )
    monthly_counts = {
        month: {} for month in months
    }
    for article, article_date in valid_articles:
        month = article_date.strftime("%Y-%m")
        keywords = article.get("keywords", {})
        for keyword, count in keywords.items():
            monthly_counts[month][keyword] = (
                monthly_counts[month].get(keyword, 0) + count
            )
    all_keywords = set()
    for month_data in monthly_counts.values():
        all_keywords.update(month_data.keys())
    trend_results = {}
    for keyword in sorted(all_keywords):
        keyword_trend = []
        previous_count = None
        for month in months:
            current_count = monthly_counts[month].get(
                keyword, 0
            )
            if previous_count is None or previous_count == 0:
                growth = None
            else:
                growth = (
                    (current_count - previous_count)
                    / previous_count
                ) * 100
            keyword_trend.append({
                "month": month,
                "mentions": current_count,
                "growth_percentage": (
                    round(growth, 2)
                    if growth is not None
                    else None
                )
            })
            previous_count = current_count
        trend_results[keyword] = keyword_trend
    return trend_results
def calculate_yearly_trends(articles):
    yearly_counts = {}
    for article in articles:
        try:
            article_date = date.fromisoformat(
                str(article.get("date"))
            )
        except (ValueError, TypeError):
            continue
        if article_date > date.today():
            continue
        year = article_date.year
        if year not in yearly_counts:
            yearly_counts[year] = {}
        for keyword, count in article.get("keywords", {}).items():
            yearly_counts[year][keyword] = (
                yearly_counts[year].get(keyword, 0) + count
            )
    trend_results = {}
    all_keywords = set()
    for year_data in yearly_counts.values():
        all_keywords.update(year_data.keys())
    for keyword in sorted(all_keywords):
        keyword_trend = []
        previous_count = None
        for year in sorted(yearly_counts.keys()):
            current_count = yearly_counts[year].get(
                keyword, 0
            )
            if current_count == 0:
                continue
            if previous_count is None:
                growth = None
            else:
                growth = (
                    (current_count - previous_count)
                    / previous_count
                ) * 100
            keyword_trend.append({
                "year": year,
                "mentions": current_count,
                "growth_percentage": (
                    round(growth, 2)
                    if growth is not None
                    else None
                )
            })
            previous_count = current_count
        trend_results[keyword] = keyword_trend
    return trend_results
if __name__ == "__main__":
    articles = get_processed_articles()
    processed_articles = extract_keywords_from_articles(
        articles
    )
    monthly_results = calculate_monthly_trends(
        processed_articles
    )
    print("\n========== MONTHLY KEYWORD TRENDS ==========\n")
    for keyword, monthly_data in monthly_results.items():
        print(f"\nKeyword: {keyword}")
        for item in monthly_data:
            growth = item["growth_percentage"]
            growth_text = (
                f"{growth}%"
                if growth is not None
                else "N/A"
            )
            print(
                f"  {item['month']} | "
                f"Mentions: {item['mentions']} | "
                f"Growth: {growth_text}"
            )
    yearly_results = calculate_yearly_trends(
        processed_articles
    )
    print("\n========== YEARLY KEYWORD TRENDS ==========\n")
    for keyword, yearly_data in yearly_results.items():
        print(f"\nKeyword: {keyword}")
        for item in yearly_data:
            growth = item["growth_percentage"]
            growth_text = (
                f"{growth}%"
                if growth is not None
                else "N/A"
            )
            print(
                f"  {item['year']} | "
                f"Mentions: {item['mentions']} | "
                f"Growth: {growth_text}"
            )