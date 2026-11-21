import re
from feed_manager import get_processed_articles
CATEGORY_KEYWORDS = {
    "AI & Machine Learning": [
        "artificial intelligence",
        "ai",
        "machine learning",
        "deep learning",
        "neural network",
        "large language model",
        "generative ai",
        "computer vision",
        "natural language processing",
        "protein folding",
        "artificial general intelligence",
        "agi"
    ],
    "Quantum Computing": [
        "quantum",
        "quantum computing",
        "quantum encryption",
        "quantum key distribution",
        "qubit",
        "superposition",
        "entanglement",
        "quantum processor"
    ],
    "Cybersecurity": [
        "cyber",
        "cybersecurity",
        "encryption",
        "phishing",
        "malware",
        "hacker",
        "cyber attack",
        "vulnerability",
        "zero-day",
        "data breach",
        "ransomware",
        "firewall"
    ],
    "Edge & Hardware Systems": [
        "edge computing",
        "iot",
        "internet of things",
        "chip",
        "semiconductor",
        "processor",
        "hardware",
        "embedded systems",
        "sensor",
        "robotics",
        "gpu",
        "npu"
    ]
}
def count_keywords(text, keywords):
    keyword_counts = {}
    for keyword in keywords:
        pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            keyword_counts[keyword] = len(matches)
    return keyword_counts
def extract_keywords_from_articles(articles):
    processed_articles = []
    for article in articles:
        title = article.get("title", "")
        content = article.get("text", "")
        full_text = title + " " + content
        category = article.get(
            "category", "Emerging Tech (General)"
        )
        category_keywords = CATEGORY_KEYWORDS.get(category, [])
        all_keywords = [
            keyword
            for keyword_list in CATEGORY_KEYWORDS.values()
            for keyword in keyword_list
        ]
        keywords = list(dict.fromkeys(
            category_keywords + all_keywords
        ))
        extracted_keywords = count_keywords(full_text, keywords)
        article_result = article.copy()
        article_result["keywords"] = extracted_keywords
        processed_articles.append(article_result)
    return processed_articles
if __name__ == "__main__":
    articles = get_processed_articles()
    results = extract_keywords_from_articles(articles)
    print("\n========== KEYWORD EXTRACTION RESULTS ==========\n")
    for article in results:
        print("Article:", article.get("title"))
        print("Category:", article.get("category"))
        print("Extracted Keywords:")
        if article["keywords"]:
            for keyword, count in article["keywords"].items():
                print(f"  {keyword} -> {count}")
        else:
            print("  No matching keywords found.")
        print("-" * 50)