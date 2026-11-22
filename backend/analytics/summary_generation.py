import re
from collections import Counter
from backend.ingestion.feed_manager import get_processed_articles
STOP_WORDS = {
    "the", "is", "are", "was", "were", "a", "an",
    "and", "or", "but", "in", "on", "at", "to",
    "of", "for", "with", "by", "from", "as", "it",
    "this", "that", "these", "those", "has", "have",
    "had", "be", "been", "being", "its", "their",
    "they", "them", "he", "she", "we", "you",
    "will", "would", "can", "could", "may", "might",
    "about", "into", "than", "then", "also", "such"
}
def split_sentences(text):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]
def calculate_sentence_scores(sentences):
    word_frequencies = Counter()
    for sentence in sentences:
        words = re.findall(
            r'\b[a-zA-Z]{3,}\b',
            sentence.lower()
        )
        for word in words:
            if word not in STOP_WORDS:
                word_frequencies[word] += 1
    sentence_scores = {}
    for index, sentence in enumerate(sentences):
        words = re.findall(
            r'\b[a-zA-Z]{3,}\b',
            sentence.lower()
        )
        meaningful_words = [
            word for word in words
            if word not in STOP_WORDS
        ]
        if len(words) < 8 or len(words) > 40:
            sentence_scores[index] = 0
            continue
        if len(meaningful_words) < 4:
            sentence_scores[index] = 0
            continue
        score = sum(
            word_frequencies[word]
            for word in meaningful_words
        )
        score = score / len(meaningful_words)
        if index == 0:
            score *= 1.3
        elif index == 1:
            score *= 1.1
        sentence_scores[index] = score
    return sentence_scores
def generate_summary(article, max_sentences=3, max_words=50):
    text = (
        article.get("text")
        or article.get("abstract")
        or article.get("description")
        or ""
    )
    if not str(text).strip():
        return article.get("title", "Summary unavailable")
    sentences = split_sentences(str(text))
    if not sentences:
        return article.get("title", "Summary unavailable")
    scores = calculate_sentence_scores(sentences)
    ranked_sentences = sorted(
        scores,
        key=scores.get,
        reverse=True
    )
    selected_indices = []
    total_words = 0
    for index in ranked_sentences:
        if scores[index] <= 0:
            continue
        sentence_word_count = len(
            sentences[index].split()
        )
        if len(selected_indices) >= max_sentences:
            break
        if total_words + sentence_word_count > max_words:
            continue
        selected_indices.append(index)
        total_words += sentence_word_count
    if not selected_indices:
        return article.get("title", "Summary unavailable")
    selected_indices.sort()
    return " ".join(
        sentences[index]
        for index in selected_indices
    )
def generate_summaries(articles):
    summarized_articles = []
    for article in articles:
        article_copy = article.copy()
        article_copy["summary"] = generate_summary(article)
        summarized_articles.append(article_copy)
    return summarized_articles
if __name__ == "__main__":
    articles = get_processed_articles()
    summarized_articles = generate_summaries(articles)
    print("\n========== ARTICLE SUMMARIES ==========\n")
    for article in summarized_articles:
        print(f"Title: {article.get('title', 'Untitled')}")
        print(f"Category: {article.get('category', 'Unknown')}")
        print(f"Summary: {article['summary']}")
        print("-" * 70)