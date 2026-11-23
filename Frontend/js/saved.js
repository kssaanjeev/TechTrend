/**
 * Emerging Technology Trend Identifier - Saved Reading List & Citations Logic
 * Manages bookmarked articles, citation style copying (APA, IEEE, BibTeX), and CSV export.
 */

let savedPageState = {
    articles: []
};

document.addEventListener("DOMContentLoaded", async () => {
    updateNavSavedBadge();

    // Load articles from shared fetcher (uses live API if enabled, otherwise curated fallback)
    const payload = await fetchDashboardPayload();
    savedPageState.articles = payload.data.articles || CURATED_DATA.articles;

    bindSavedEvents();
    renderSavedReadingList();
});

function bindSavedEvents() {
    document.getElementById("savedCategoryFilter")?.addEventListener("change", renderSavedReadingList);
    document.getElementById("savedSearchInput")?.addEventListener("input", renderSavedReadingList);

    document.getElementById("citationFormatSelect")?.addEventListener("change", (e) => {
        triggerToast(`Citation format switched to ${e.target.value}.`);
    });

    document.getElementById("exportCsvBtn")?.addEventListener("click", exportSavedArticlesToCsv);

    document.getElementById("clearAllSavedBtn")?.addEventListener("click", () => {
        const currentIds = getSavedIds();
        if (currentIds.size === 0) {
            triggerToast("Your Saved Reading List is already empty.", true);
            return;
        }
        saveIds(new Set());
        renderSavedReadingList();
        triggerToast("Cleared all saved reading items.");
    });
}

function getBookmarkedArticles() {
    const savedIds = getSavedIds();
    return savedPageState.articles.filter(article => savedIds.has(article.id));
}

function getFilteredSavedArticles() {
    const category = document.getElementById("savedCategoryFilter")?.value || "All";
    const search = (document.getElementById("savedSearchInput")?.value || "").trim().toLowerCase();

    return getBookmarkedArticles().filter(article => {
        if (category !== "All" && article.category !== category) return false;

        if (search) {
            const inTitle = (article.title || "").toLowerCase().includes(search);
            const inSummary = (article.summary || "").toLowerCase().includes(search);
            const inAuthors = (article.authors || "").toLowerCase().includes(search);
            const inVenue = (article.venue || "").toLowerCase().includes(search);
            const inKeywords = (article.keywords || []).some(k => k.toLowerCase().includes(search));
            if (!inTitle && !inSummary && !inAuthors && !inVenue && !inKeywords) return false;
        }

        return true;
    });
}

function renderSavedReadingList() {
    const container = document.getElementById("savedArticlesContainer");
    const totalSavedBadge = document.getElementById("savedCountBadge");
    const filteredLabel = document.getElementById("savedFilteredLabel");

    const allSaved = getBookmarkedArticles();
    const filteredSaved = getFilteredSavedArticles();

    if (totalSavedBadge) {
        totalSavedBadge.textContent = allSaved.length;
    }
    if (filteredLabel) {
        filteredLabel.textContent = `Showing ${filteredSaved.length} of ${allSaved.length} saved item${allSaved.length === 1 ? "" : "s"}`;
    }

    updateNavSavedBadge();

    if (!container) return;

    if (allSaved.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <i class="bi bi-bookmark fs-1 d-block mb-2"></i>
                <p class="fw-semibold mb-1">Your Saved Reading List is empty.</p>
                <p class="small mb-3">Bookmark research papers or tech news articles from the Dashboard to build your reading list.</p>
                <a href="index.html" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-grid-1x2-fill me-1"></i>Go to Dashboard
                </a>
            </div>
        `;
        return;
    }

    if (filteredSaved.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <i class="bi bi-funnel fs-2 d-block mb-2"></i>
                <p class="fw-semibold mb-1">No saved items match your current filter.</p>
                <p class="small mb-0">Try selecting "All Topics" or clearing the search box.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredSaved.map(article => {
        const sourceBadgeClass = article.sourceType === "Research Paper" ? "source-pill-paper" : "source-pill-news";
        const sourceIcon = article.sourceType === "Research Paper" ? "bi-journal-text" : "bi-newspaper";

        return `
            <article class="article-card">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle">
                            ${escapeText(article.category)}
                        </span>
                        <span class="badge ${sourceBadgeClass}">
                            <i class="bi ${sourceIcon} me-1"></i>${escapeText(article.sourceType)}
                        </span>
                        <span class="text-secondary small">
                            <i class="bi bi-calendar3 me-1"></i>${escapeText(article.date)} • ${escapeText(article.venue || "")}
                        </span>
                    </div>

                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            onclick="handleCopySavedCitation('${article.id}')"
                            title="Copy citation in selected format"
                        >
                            <i class="bi bi-quote me-1"></i>Copy Citation
                        </button>

                        <a
                            href="${article.url}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-sm btn-outline-primary"
                        >
                            <i class="bi bi-box-arrow-up-right me-1"></i>Source Link
                        </a>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            onclick="handleRemoveSavedArticle('${article.id}')"
                            title="Remove from Saved Reading List"
                        >
                            <i class="bi bi-bookmark-x me-1"></i>Remove
                        </button>
                    </div>
                </div>

                <h5 class="fw-bold mb-2">${escapeText(article.title)}</h5>
                <p class="text-secondary small mb-2">
                    <strong class="text-light-emphasis">Summary:</strong> ${escapeText(article.summary)}
                </p>

                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-1">
                    <div>
                        ${(article.keywords || []).map(kw => `
                            <span class="keyword-pill">#${escapeText(kw)}</span>
                        `).join("")}
                    </div>
                    <span class="text-secondary small fst-italic">Authors: ${escapeText(article.authors || "Unknown")}</span>
                </div>
            </article>
        `;
    }).join("");
}

window.handleCopySavedCitation = function(articleId) {
    const article = savedPageState.articles.find(a => a.id === articleId);
    if (!article) return;

    const style = document.getElementById("citationFormatSelect")?.value || "APA";
    const citation = formatCitation(article, style);

    navigator.clipboard.writeText(citation).then(() => {
        triggerToast(`${style} citation copied to clipboard!`);
    }).catch(() => {
        triggerToast("Unable to access clipboard.", true);
    });
};

window.handleRemoveSavedArticle = function(articleId) {
    const ids = getSavedIds();
    ids.delete(articleId);
    saveIds(ids);
    renderSavedReadingList();
    triggerToast("Removed from Saved Reading List.");
};

function exportSavedArticlesToCsv() {
    const items = getFilteredSavedArticles();
    if (items.length === 0) {
        triggerToast("No saved articles to export.", true);
        return;
    }

    const headers = ["ID", "Title", "Authors", "Venue", "SourceType", "Category", "Date", "Keywords", "Summary", "URL"];
    const rows = items.map(a => [
        a.id,
        a.title,
        a.authors || "",
        a.venue || "",
        a.sourceType || "",
        a.category || "",
        a.date || "",
        (a.keywords || []).join("; "),
        a.summary || "",
        a.url || ""
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","));

    const csvString = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "saved_reading_list_citations.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    triggerToast(`Exported ${items.length} article${items.length === 1 ? "" : "s"} to CSV.`);
}

function escapeText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}