from .collector import load_and_clean_articles

# Keywords used to detect each technology category
CATEGORY_RULES = {
    "AI & Machine Learning": [
        "ai", "artificial intelligence", "machine learning", "deep learning",
        "neural", "llm", "gpt", "model", "language model", "computer vision"
    ],
    "Quantum Computing": [
        "quantum", "qubit", "superposition", "entanglement", "quantum processor"
    ],
    "Cybersecurity": [
        "cyber", "security", "encryption", "phishing", "malware", "hacker",
        "vulnerability", "zero-day", "breach", "ransomware", "firewall"
    ],
    "Edge & Hardware Systems": [
        "edge", "iot", "chip", "semiconductor", "processor", "hardware",
        "embedded", "sensor", "robotics", "gpu", "npu"
    ]
}


def assign_category(article):
    # Combine title and text in lowercase to search for matching keywords
    content = f"{article.get('title', '')} {article.get('text', '')}".lower()

    best_category = "Emerging Tech (General)"
    highest_matches = 0

    for category, keywords in CATEGORY_RULES.items():
        matches = sum(1 for word in keywords if word in content)
        if matches > highest_matches:
            highest_matches = matches
            best_category = category

    return best_category


def categorize_articles(articles):
    categorized_list = []

    for article in articles:
        updated_article = article.copy()
        updated_article["category"] = assign_category(article)
        categorized_list.append(updated_article)

    return categorized_list


if __name__ == "__main__":
    sample_articles = load_and_clean_articles()
    tagged_articles = categorize_articles(sample_articles)

    print(f"Task 2 Complete! Categorized {len(tagged_articles)} articles:")
    for item in tagged_articles:
        print(f"- {item['title']}  -->  [{item['category']}]")
