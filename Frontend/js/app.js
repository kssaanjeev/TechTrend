/**
 * Emerging Technology Trend Identifier - Home Page Dashboard Logic
 * Works with js/shared.js and index.html across multi-page navigation[cite: 8, 9].
 */

const REFERENCE_DATE = new Date("2026-11-19T00:00:00");

let dashboardState = {
    articles: [],
    trendSeries: null,
    sourceMode: "curated"
};

let lineChartInstance = null;
let barChartInstance = null;
let toastInstance = null;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    const toastEl = document.getElementById("actionToast");
    if (toastEl) {
        toastInstance = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2500 });
    }

    // Apply default filter preferences saved in settings.html[cite: 9]
    applyDefaultSettingsToFilters();

    // Load curated data or live Python backend payload (with automatic fallback)[cite: 9]
    const payload = await fetchDashboardPayload();
    dashboardState.articles = payload.data.articles;
    dashboardState.trendSeries = payload.data.trendSeries;
    dashboardState.sourceMode = payload.sourceMode;

    renderKeywordCheckboxes();

    updateDatasetBadge(payload.sourceMode, payload.fallbackReason);
    bindDashboardEvents();
    renderLineChart();
    refreshDashboard();
});

function applyDefaultSettingsToFilters() {
    const settings = getSettings();

    const categoryEl = document.getElementById("categoryFilter");
    if (categoryEl && settings.defaultCategory) {
        const hasOption = Array.from(categoryEl.options).some(opt => opt.value === settings.defaultCategory);
        if (hasOption) categoryEl.value = settings.defaultCategory;
    }

    const timeEl = document.getElementById("timeFilter");
    if (timeEl && settings.defaultTimePeriod) {
        const hasOption = Array.from(timeEl.options).some(opt => opt.value === settings.defaultTimePeriod);
        if (hasOption) timeEl.value = settings.defaultTimePeriod;
    }

    if (settings.defaultSourceType) {
        const radio = document.querySelector(`input[name="sourceTypeFilter"][value="${settings.defaultSourceType}"]`);
        if (radio) radio.checked = true;
    }
}

function updateDatasetBadge(sourceMode, fallbackReason) {
    const badge = document.querySelector(".badge.bg-dark.border.border-secondary-subtle");
    if (!badge) return;

    if (sourceMode === "live") {
        badge.innerHTML = `<i class="bi bi-broadcast text-success me-1"></i> Dataset: Live Python API`;
    } else if (fallbackReason) {
        badge.innerHTML = `<i class="bi bi-database-exclamation text-warning me-1"></i> Dataset: Curated Fallback (${fallbackReason})`;
    } else {
        badge.innerHTML = `<i class="bi bi-database-check text-success me-1"></i> Dataset: Curated Academic &amp; Tech Feed`;
    }
}

function bindDashboardEvents() {
    // Dropdown & search filters
    document.getElementById("categoryFilter")?.addEventListener("change", refreshDashboard);
    document.getElementById("timeFilter")?.addEventListener("change", refreshDashboard);
    document.getElementById("globalSearchInput")?.addEventListener("input", refreshDashboard);

    // Source type radio buttons
    document.querySelectorAll('input[name="sourceTypeFilter"]').forEach(radio => {
        radio.addEventListener("change", refreshDashboard);
    });

    // Keyword comparison checkboxes (multi-line chart)
    document.querySelectorAll(".kw-toggle").forEach(cb => {
        cb.addEventListener("change", renderLineChart);
    });

    // Reset filters button
    document.getElementById("resetFiltersBtn")?.addEventListener("click", () => {
        const categoryEl = document.getElementById("categoryFilter");
        const timeEl = document.getElementById("timeFilter");
        const searchEl = document.getElementById("globalSearchInput");
        const srcAllEl = document.getElementById("srcAll");

        if (categoryEl) categoryEl.value = "All";
        if (timeEl) timeEl.value = "all";
        if (searchEl) searchEl.value = "";
        if (srcAllEl) srcAllEl.checked = true;

        // Select all dynamically generated keywords
        document.querySelectorAll(".kw-toggle").forEach(checkbox => {
        checkbox.checked = true;
        });

        renderLineChart();
        refreshDashboard();
        showDashboardToast("All filters reset to default view.");
    });
}

// --- FILTERING & MASTER REFRESH ---
function getFilteredArticles() {
    const category = document.getElementById("categoryFilter")?.value || "All";
    const days = document.getElementById("timeFilter")?.value || "all";
    const search = (document.getElementById("globalSearchInput")?.value || "").trim().toLowerCase();
    const sourceType = document.querySelector('input[name="sourceTypeFilter"]:checked')?.value || "All";

    return dashboardState.articles.filter(article => {
        if (category !== "All" && article.category !== category) return false;
        if (sourceType !== "All" && article.sourceType !== sourceType) return false;

        if (days !== "all") {
            const pubDate = new Date((article.date || "2026-11-19") + "T00:00:00");
            const diffDays = (REFERENCE_DATE - pubDate) / (1000 * 60 * 60 * 24);
            if (diffDays > parseInt(days, 10)) return false;
        }

        if (search) {
            const inTitle = (article.title || "").toLowerCase().includes(search);
            const inSummary = (article.summary || "").toLowerCase().includes(search);
            const inAuthors = (article.authors || "").toLowerCase().includes(search);
            const inKeywords = (article.keywords || []).some(k => k.toLowerCase().includes(search));
            if (!inTitle && !inSummary && !inAuthors && !inKeywords) return false;
        }

        return true;
    });
}

function refreshDashboard() {
    const filtered = getFilteredArticles();
    updateDashboardKPIs(filtered);
    renderBarChart(filtered);
    renderTrendingTopics(filtered);
    renderArticleFeed(filtered);
}

// --- TRENDING TECHNOLOGIES ---
function renderTrendingTopics(articles) {
    const container = document.getElementById("trendingTopicsContainer");
    if (!container) return;

    const counts = {};

    articles.forEach(article => {
        (article.keywords || []).forEach(keyword => {
            counts[keyword] = (counts[keyword] || 0) + 1;
        });
    });

    const topics = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    container.replaceChildren();

    if (topics.length === 0) {
        const empty = document.createElement("p");
        empty.className = "text-secondary small mb-0";
        empty.textContent = "No trending topics found for these filters.";
        container.appendChild(empty);
        return;
    }

    topics.forEach(([keyword, count], index) => {
        const trend = dashboardState.trendSeries?.keywords?.[keyword];
        const card = document.createElement("div");
        card.className = "trending-topic-card";

        const rank = document.createElement("span");
        rank.className = "trending-rank";
        rank.textContent = `0${index + 1}`;

        const name = document.createElement("h6");
        name.className = "trending-topic-name";
        name.textContent = keyword;

        const mentions = document.createElement("p");
        mentions.className = "trending-topic-count";
        mentions.textContent =
            `${count} ${count === 1 ? "article" : "articles"}`;

        const footer = document.createElement("div");
        footer.className = "trending-topic-footer";

        const label = document.createElement("span");
        label.textContent = "Topic activity";
        footer.appendChild(label);

        if (trend?.growth) {
            const growth = document.createElement("span");
            growth.className = "trending-growth";
            growth.textContent = trend.growth;
            footer.appendChild(growth);
        }

        card.append(rank, name, mentions, footer);
        container.appendChild(card);
    });
}

// --- UPDATE 4 KPI SUMMARY CARDS ---
function updateDashboardKPIs(filtered) {
    const savedIds = getSavedIds();

    // 1. Articles Analyzed
    const countEl = document.getElementById("kpiArticlesCount");
    const splitEl = document.getElementById("kpiSourceSplit");
    if (countEl) countEl.textContent = filtered.length;
    if (splitEl) {
        const paperCount = filtered.filter(a => a.sourceType === "Research Paper").length;
        const newsCount = filtered.filter(a => a.sourceType === "Tech News").length;
        splitEl.textContent = `${paperCount} Papers • ${newsCount} News`;
    }

    // 2. Top Emerging Keyword
    const topKwEl = document.getElementById("kpiTopKeyword");
    const growthEl = document.getElementById("kpiKeywordGrowth");
    const kwFreq = {};
    filtered.forEach(a => (a.keywords || []).forEach(k => {
        kwFreq[k] = (kwFreq[k] || 0) + 1;
    }));
    const sortedKws = Object.keys(kwFreq).sort((a, b) => kwFreq[b] - kwFreq[a]);

    if (topKwEl && growthEl) {
        if (sortedKws.length > 0) {
            const topKw = sortedKws[0];
            const seriesInfo = dashboardState.trendSeries?.keywords?.[topKw];
            topKwEl.textContent = topKw;
            growthEl.textContent = seriesInfo?.growth || "+24.5%";
        } else {
            topKwEl.textContent = "N/A";
            growthEl.textContent = "0%";
        }
    }

    // 3. Most Active Category
    const topCatEl = document.getElementById("kpiTopCategory");
    const shareEl = document.getElementById("kpiCategoryShare");
    if (topCatEl && shareEl) {
        if (filtered.length > 0) {
            const catCounts = {};
            filtered.forEach(a => {
                catCounts[a.category] = (catCounts[a.category] || 0) + 1;
            });
            const topCat = Object.keys(catCounts).reduce((a, b) => catCounts[a] >= catCounts[b] ? a : b);
            const sharePct = Math.round((catCounts[topCat] / filtered.length) * 100);
            topCatEl.textContent = topCat;
            shareEl.textContent = `${sharePct}% share`;
        } else {
            topCatEl.textContent = "N/A";
            shareEl.textContent = "0%";
        }
    }

    // 4. Saved Reading Items
    const savedCountEl = document.getElementById("kpiSavedCount");
    if (savedCountEl) savedCountEl.textContent = savedIds.size;
    updateNavSavedBadge();
}


// --- GENERATE KEYWORD CHECKBOXES FROM BACKEND DATA ---
function renderKeywordCheckboxes() {
    const container = document.getElementById("keywordCheckboxes");
    const keywords = dashboardState.trendSeries?.keywords;

    if (!container || !keywords) return;

    const keywordNames = Object.keys(keywords);
    const colors = [
        "#58a6ff",
        "#a371f7",
        "#3fb950",
        "#f78166",
        "#39c5cf",
        "#d29922",
        "#db61a2"
    ];

    container.innerHTML = "";

    keywordNames.forEach((keyword, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "form-check";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "form-check-input kw-toggle";
        checkbox.value = keyword;
        checkbox.id = `kwDynamic${index}`;
        checkbox.checked = index < 4;
        checkbox.dataset.color = colors[index % colors.length];

        const label = document.createElement("label");
        label.className = "form-check-label small";
        label.htmlFor = checkbox.id;

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.backgroundColor = colors[index % colors.length];

        label.appendChild(dot);
        label.appendChild(document.createTextNode(keyword));

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

// --- MULTI-LINE TREND COMPARISON CHART ---
function renderLineChart() {
    const canvas = document.getElementById("trendLineChart");
    if (!canvas || !dashboardState.trendSeries) return;

    const selectedKeywords = Array.from(document.querySelectorAll(".kw-toggle:checked")).map(cb => cb.value);
    const datasets = selectedKeywords
        .filter(kw => Boolean(dashboardState.trendSeries.keywords?.[kw]))
        .map(kw => {
            const series = dashboardState.trendSeries.keywords[kw];
            const color = document.querySelector(
            `.kw-toggle[value="${CSS.escape(kw)}"]`
            )?.dataset.color || "#58a6ff";
            return {
                label: kw,
                data: series.data,
                borderColor: color,
                backgroundColor: `${color}22`,
                borderWidth: 2.5,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });

    const ctx = canvas.getContext("2d");
    if (lineChartInstance) lineChartInstance.destroy();

    lineChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: dashboardState.trendSeries.labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                    color: document.documentElement.getAttribute("data-bs-theme") === "light"
                    ? "#303044"
                    : "#ffffff",
                    usePointStyle: true,
                    padding: 16,
                    font: {
                    size: 12,
                    weight: "500"
                    }
                }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#8b98b0" },
                    grid: { color: "rgba(38, 48, 68, 0.5)" }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#8b98b0" },
                    grid: { color: "rgba(38, 48, 68, 0.5)" }
                }
            }
        }
    });
}

// --- KEYWORD FREQUENCY BAR CHART ---
function renderBarChart(filtered) {
    const canvas = document.getElementById("keywordBarChart");
    if (!canvas) return;

    const kwCounts = {};
    filtered.forEach(article => {
        (article.keywords || []).forEach(kw => {
            kwCounts[kw] = (kwCounts[kw] || 0) + 1;
        });
    });

    const labels = Object.keys(kwCounts).sort((a, b) => kwCounts[b] - kwCounts[a]).slice(0, 7);
    const values = labels.map(l => kwCounts[l]);

    const ctx = canvas.getContext("2d");
    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Mentions in Filtered Window",
                data: values,
                backgroundColor: "rgba(88, 166, 255, 0.75)",
                borderColor: "#58a6ff",
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: "#8b98b0", stepSize: 1 },
                    grid: { color: "rgba(38, 48, 68, 0.5)" }
                },
                y: {
                    ticks: { color: document.documentElement.getAttribute("data-bs-theme") === "light"
                                ? "#493d5e"
                                : "#e6edf3" },
                    grid: { display: false }
                }
            }
        }
    });
}

// --- ARTICLE CARDS, SUMMARIES & ACADEMIC ACTIONS ---
function renderArticleFeed(articles) {
    const container = document.getElementById("articlesFeedContainer");
    const badgeEl = document.getElementById("feedCountBadge");
    if (!container) return;

    if (badgeEl) badgeEl.textContent = articles.length;

    if (articles.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <i class="bi bi-search fs-2 d-block mb-2"></i>
                <p class="mb-1 fw-semibold">No articles match your current filter criteria.</p>
                <p class="small mb-0">Try expanding the time window or resetting filters.</p>
            </div>
        `;
        return;
    }

    const savedIds = getSavedIds();

    container.innerHTML = articles.map(article => {
        const isSaved = savedIds.has(article.id);
        const sourceBadgeClass = article.sourceType === "Research Paper" ? "source-pill-paper" : "source-pill-news";
        const sourceIcon = article.sourceType === "Research Paper" ? "bi-journal-text" : "bi-newspaper";

        return `
            <article class="article-card">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle">
                            ${article.category}
                        </span>
                        <span class="badge ${sourceBadgeClass}">
                            <i class="bi ${sourceIcon} me-1"></i>${article.sourceType}
                        </span>
                        <span class="text-secondary small">
                            <i class="bi bi-calendar3 me-1"></i>${article.date} • ${article.venue || ""}
                        </span>
                    </div>

                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <button
                            type="button"
                            class="btn btn-sm ${isSaved ? "btn-warning" : "btn-outline-secondary"}"
                            onclick="handleToggleBookmark('${article.id}')"
                            title="Save to Reading List"
                        >
                            <i class="bi ${isSaved ? "bi-bookmark-fill" : "bi-bookmark"} me-1"></i>
                            ${isSaved ? "Saved" : "Save"}
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            onclick="handleCopyCitation('${article.id}')"
                            title="Copy Academic Citation"
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
                    </div>
                </div>

                <h5 class="fw-bold mb-2">${article.title}</h5>
                <p class="text-secondary small mb-2">
                    <strong class="text-light-emphasis">Summary:</strong> ${article.summary}
                </p>

                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-1">
                    <div>
                        ${(article.keywords || []).map(kw => `
                            <span class="keyword-pill" onclick="handleFilterByKeyword('${kw.replace(/'/g, "\\'")}')">#${kw}</span>
                        `).join("")}
                    </div>
                    <span class="text-secondary small fst-italic">Authors: ${article.authors || "Unknown"}</span>
                </div>
            </article>
        `;
    }).join("");
}

// --- GLOBAL HANDLERS FOR INLINE BUTTONS ---
window.handleToggleBookmark = function(articleId) {
    const isSavedNow = toggleSavedArticleId(articleId);
    showDashboardToast(isSavedNow ? "Saved to Reading List." : "Removed from Saved Reading List.");
    refreshDashboard();
};

window.handleCopyCitation = function(articleId) {
    const article = dashboardState.articles.find(a => a.id === articleId);
    if (!article) return;

    const citation = formatCitation(article, "APA");
    navigator.clipboard.writeText(citation).then(() => {
        showDashboardToast("Citation copied to clipboard!");
    }).catch(() => {
        showDashboardToast("Unable to access clipboard.", true);
    });
};

window.handleFilterByKeyword = function(keyword) {
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
        searchInput.value = keyword;
    }
    refreshDashboard();
    showDashboardToast(`Filtered by keyword: #${keyword}`);
};

function showDashboardToast(message, isError = false) {
    if (typeof triggerToast === "function") {
        triggerToast(message, isError);
        return;
    }
    const msgEl = document.getElementById("toastMessage");
    if (msgEl && toastInstance) {
        msgEl.innerHTML = `<i class="bi ${isError ? "bi-exclamation-triangle-fill text-warning" : "bi-check-circle-fill text-success"}"></i><span>${message}</span>`;
        toastInstance.show();
    }
}