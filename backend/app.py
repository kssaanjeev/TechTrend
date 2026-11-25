
from flask import Flask, jsonify, request

from backend.ingestion.feed_manager import get_processed_articles
from backend.ingestion.feed_service import (
    get_feeds,
    test_feed,
    add_feed,
    sync_all_feeds,
    update_feed_status,
    delete_feed
)

from backend.analytics.keyword_analysis import extract_keywords_from_articles
from backend.analytics.summary_generation import generate_summaries
from backend.analytics.keyword_trends import calculate_monthly_trends

app = Flask(__name__)


# Allow requests from the local frontend
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, PATCH, DELETE, OPTIONS"
    )
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# --------------------------------------------------
# DASHBOARD API
# --------------------------------------------------

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    try:
        # 1. Collect and categorize articles
        articles = get_processed_articles()

        # 2. Extract keyword counts
        articles_with_keywords = extract_keywords_from_articles(articles)

        # 3. Generate article summaries
        summarized_articles = generate_summaries(articles_with_keywords)

        # 4. Calculate monthly keyword trends
        monthly_trends = calculate_monthly_trends(articles_with_keywords)

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
                growth = f"{latest['growth_percentage']:+.2f}%"

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

        # 8. Return dashboard response
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


# --------------------------------------------------
# FEED MANAGEMENT APIs
# --------------------------------------------------

@app.route("/api/feeds", methods=["GET"])
def list_feeds():
    try:
        return jsonify({
            "feeds": get_feeds()
        })
    except Exception as error:
        app.logger.exception("Unable to retrieve feeds")
        return jsonify({"error": str(error)}), 500


@app.route("/api/feeds/test", methods=["POST"])
def check_feed():
    try:
        data = request.get_json(silent=True) or {}

        name = data.get("name", "Test Feed").strip()
        feed_type = data.get("type", "").strip()
        endpoint = data.get("endpoint", "").strip()

        if not endpoint:
            return jsonify({"error": "Feed URL is required."}), 400

        if feed_type not in ("Research Paper", "Tech News"):
            return jsonify({"error": "Invalid feed type."}), 400

        result = test_feed(name, feed_type, endpoint)

        return jsonify({
            "message": "Feed connection successful.",
            "articleCount": result["articleCount"],
            "success": True
        })

    except Exception as error:
        return jsonify({
            "success": False,
            "error": str(error)
        }), 400


@app.route("/api/feeds", methods=["POST"])
def create_feed():
    try:
        data = request.get_json(silent=True) or {}

        name = data.get("name", "").strip()
        feed_type = data.get("type", "").strip()
        endpoint = data.get("endpoint", "").strip()

        if not name or not endpoint:
            return jsonify({
                "error": "Feed name and URL are required."
            }), 400

        if feed_type not in ("Research Paper", "Tech News"):
            return jsonify({"error": "Invalid feed type."}), 400

        feed = add_feed(name, feed_type, endpoint)

        return jsonify({
            "message": "Feed added and initial sync completed.",
            "feed": feed
        }), 201

    except Exception as error:
        app.logger.exception("Unable to add feed")
        return jsonify({"error": str(error)}), 400


@app.route("/api/feeds/sync", methods=["POST"])
def sync_feeds():
    try:
        results = sync_all_feeds()

        return jsonify({
            "message": "Feed synchronization completed.",
            "results": results
        })

    except Exception as error:
        app.logger.exception("Feed synchronization failed")
        return jsonify({"error": str(error)}), 500


@app.route("/api/feeds/<feed_id>", methods=["PATCH"])
def change_feed_status(feed_id):
    try:
        data = request.get_json(silent=True) or {}

        if "active" not in data or not isinstance(data["active"], bool):
            return jsonify({
                "error": "Provide active as true or false."
            }), 400

        feed = update_feed_status(feed_id, data["active"])

        if feed is None:
            return jsonify({"error": "Feed not found."}), 404

        return jsonify({
            "message": "Feed status updated.",
            "feed": feed
        })

    except Exception as error:
        app.logger.exception("Unable to update feed")
        return jsonify({"error": str(error)}), 500


@app.route("/api/feeds/<feed_id>", methods=["DELETE"])
def remove_feed(feed_id):
    try:
        existing_feed = next(
            (feed for feed in get_feeds() if feed["id"] == feed_id),
            None
        )

        if existing_feed is None:
            return jsonify({"error": "Feed not found."}), 404

        delete_feed(feed_id)

        return jsonify({
            "message": "Feed and its stored articles removed."
        })

    except Exception as error:
        app.logger.exception("Unable to delete feed")
        return jsonify({"error": str(error)}), 500


# --------------------------------------------------
# START SERVER
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8000,
        debug=True
    )
