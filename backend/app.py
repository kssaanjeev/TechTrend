
from flask import Flask, jsonify

from backend.ingestion.feed_manager import get_processed_articles
from backend.analytics.keyword_analysis import extract_keywords_from_articles
from backend.analytics.summary_generation import generate_summaries
from backend.analytics.keyword_trends import calculate_monthly_trends

app = Flask(__name__)


# Allow requests from the local frontend
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    try:
        # 1. Collect and categorize articles once
        articles = get_processed_articles()

        # 2. Extract keyword counts
        articles_with_keywords = extract_keywords_from_articles(
            articles
        )

        # 3. Generate article summaries
        summarized_articles = generate_summaries(
            articles_with_keywords
        )

        # 4. Calculate monthly keyword trends
        monthly_trends = calculate_monthly_trends(
            articles_with_keywords
        )

        # 5. Prepare chart labels
        all_labels = sorted({
            item["month"]
            for trend in monthly_trends.values()
            for item in trend
        })

        labels = all_labels[-12:]
        # 6. Prepare chart data
        trend_keywords = {}

        for keyword, monthly_data in monthly_trends.items():

            monthly_lookup = {
                item["month"]: item
                for item in monthly_data
            }

            latest = monthly_data[-1] if monthly_data else None

            growth = None

            if latest and latest["growth_percentage"] is not None:
                value = latest["growth_percentage"]
                growth = f"{value:+.2f}%"

            trend_keywords[keyword] = {
                "data": [
                    monthly_lookup.get(month, {}).get("mentions", 0)
                    for month in labels
                ],
                "growth": growth
            }

        # 7. Convert keyword dictionaries into frontend arrays
        frontend_articles = []

        for article in summarized_articles:
            article_copy = article.copy()

            keyword_counts = article_copy.get("keywords", {})

            article_copy["keywords"] = (
                list(keyword_counts.keys())
                if isinstance(keyword_counts, dict)
                else keyword_counts
            )

            frontend_articles.append(article_copy)

        # 8. Return frontend-compatible response
        return jsonify({
            "articles": frontend_articles,
            "trendSeries": {
                "labels": labels,
                "keywords": trend_keywords
            }
        })

    except Exception as error:
        app.logger.exception("Dashboard API error")

        return jsonify({
            "error": "Unable to generate dashboard data",
            "details": str(error)
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8000,
        debug=True
    )
