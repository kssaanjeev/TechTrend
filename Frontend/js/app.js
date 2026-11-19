/**
 * Emerging Technology Trend Identifier - Home Page Dashboard Logic
 * Designed so `fetchDashboardData()` can easily swap mock JSON for a Python FastAPI/Flask endpoint.
 */

const REFERENCE_DATE = new Date("2026-11-19T00:00:00");
const STORAGE_KEY = "etti_saved_article_ids";

// --- MOCK DATA (Backend JSON Contract) ---
const MOCK_PAYLOAD = {
    articles: [
        {
            id: "art-101",
            title: "Hierarchical Multi-Agent Planning for Automated Scientific Literature Synthesis",
            authors: "R. Subramanian, K. Chen, M. Alvarez",
            venue: "arXiv Preprint (cs.AI)",
            sourceType: "Research Paper",
            category: "AI & Machine Learning",
            date: "2026-11-16",
            keywords: ["Agentic AI", "LLM", "Automated Research"],
            summary: "Introduces a self-verifying multi-agent architecture capable of decomposing complex domain queries, retrieving peer-reviewed citations, and reducing hallucination rates by 41%.",
            url: "https://arxiv.org/"
        },
        {
            id: "art-102",
            title: "Surface-Code Logical Qubit Benchmarks Cross Sub-Threshold Error Rates",
            authors: "D. Lindqvist et al.",
            venue: "Nature Quantum Information",
            sourceType: "Research Paper",
            category: "Quantum Computing",
            date: "2026-11-14",
            keywords: ["Quantum Error Correction", "Logical Qubits", "Fault Tolerance"],
            summary: "Demonstrates sustained error suppression across scaled superconducting qubit arrays, establishing a reproducible baseline for fault-tolerant quantum algorithms.",
            url: "https://nature.com/"
        },
        {
            id: "art-103",
            title: "Global Cloud Providers Mandate Hybrid Post-Quantum TLS Handshakes",
            authors: "S. Narayanan",
            venue: "IEEE Spectrum News",
            sourceType: "Tech News",
            category: "Cybersecurity",
            date: "2026-11-08",
            keywords: ["Post-Quantum Crypto", "Zero Trust", "TLS 1.3"],
            summary: "Major cloud and enterprise infrastructure operators have completed rollouts of ML-KEM lattice cryptography to mitigate harvest-now, decrypt-later threats.",
            url: "https://spectrum.ieee.org/"
        },
        {
            id: "art-104",
            title: "Sub-Watt Neuromorphic Vision Co-Processors for Autonomous Micro-Drones",
            authors: "A. Verma, T. Takahashi",
            venue: "IEEE Micro",
            sourceType: "Research Paper",
            category: "Edge & Hardware Systems",
            date: "2026-10-29",
            keywords: ["Neuromorphic Edge", "Spiking Neural Networks", "Low-Power AI"],
            summary: "Event-driven spiking neural hardware achieves 14x lower energy per inference than conventional mobile NPUs during high-speed obstacle avoidance.",
            url: "https://ieee.org/"
        },
        {
            id: "art-105",
            title: "Open-Weight Small Language Models Gain Traction in Campus Lab Deployments",
            authors: "L. Morales",
            venue: "ACM TechNews",
            sourceType: "Tech News",
            category: "AI & Machine Learning",
            date: "2026-10-18",
            keywords: ["Agentic AI", "Small Language Models", "Local Inference"],
            summary: "University research groups are increasingly deploying quantized 7B parameter models on local workstation GPUs for privacy-preserving code and data analysis.",
            url: "https://cacm.acm.org/"
        },
        {
            id: "art-106",
            title: "Hardware-Enforced Confidential Computing for Federated Hospital Datasets",
            authors: "H. Al-Mansoor, P. Deshmukh",
            venue: "USENIX Security Symposium",
            sourceType: "Research Paper",
            category: "Cybersecurity",
            date: "2026-09-25",
            keywords: ["Confidential Computing", "Post-Quantum Crypto", "Federated AI"],
            summary: "Combines confidential GPU enclaves with cryptographic attestation to train diagnostic models across multi-institutional clinical repositories without raw data exposure.",
            url: "https://usenix.org/"
        },
        {
            id: "art-107",
            title: "RISC-V Vector Extensions Accelerate On-Device Sensor Fusion",
            authors: "J. Park",
            venue: "EE Times",
            sourceType: "Tech News",
            category: "Edge & Hardware Systems",
            date: "2026-09-11",
            keywords: ["Neuromorphic Edge", "RISC-V", "Edge AI"],
            summary: "New open-standard RISC-V vector silicon targets industrial robotics and smart grid telemetry with deterministic real-time latency.",
            url: "https://eetimes.com/"
        }
    ],
    trendSeries: {
        labels: ["Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026", "Nov 2026"],
        keywords: {
            "Agentic AI":               { data: [48, 66, 92, 124, 165, 218], growth: "+32.1%", color: "#58a6ff" },
            "Quantum Error Correction": { data: [28, 34, 41, 55, 72, 96],    growth: "+33.3%", color: "#a371f7" },
            "Neuromorphic Edge":        { data: [30, 39, 51, 64, 79, 102],   growth: "+29.1%", color: "#3fb950" },
            "Post-Quantum Crypto":      { data: [42, 47, 53, 68, 84, 109],   growth: "+29.8%", color: "#f78166" }
        }
    }
};

// --- APPLICATION STATE ---
let state = {
    articles: [],
    trendSeries: null,
    savedIds: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")),
    showSavedOnly: false
};

let lineChart = null;
let barChart = null;
let toastInstance = null;

// --- DATA LOADER (Swap with fetch('/api/dashboard') when Python API is connected) ---
async function fetchDashboardData() {
    // Example future integration:
    // const response = await fetch("http://127.0.0.1:8000/api/trends");
    // return await response.json();
    return Promise.resolve(MOCK_PAYLOAD);
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    toastInstance = new bootstrap.Toast(document.getElementById("actionToast"), { delay: 2500 });

    const payload = await fetchDashboardData();
    state.articles = payload.articles;
    state.trendSeries = payload.trendSeries;

    bindEvents();
    renderLineChart();
    updateDashboard();
});

function bindEvents() {
    // Filter inputs
    document.getElementById("categoryFilter").addEventListener("change", updateDashboard);
    document.getElementById("timeFilter").addEventListener("change", updateDashboard);
    document.getElementById("globalSearchInput").addEventListener("input", updateDashboard);

    // Source Type radio toggles
    document.querySelectorAll('input[name="sourceTypeFilter"]').forEach(radio => {
        radio.addEventListener("change", updateDashboard);
    });

    // Compare Keywords checkboxes (Multi-line chart)
    document.querySelectorAll(".kw-toggle").forEach(cb => {
        cb.addEventListener("change", renderLineChart);
    });

    // Sidebar Navigation links
    document.querySelectorAll("#sidebarNav .nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll("#sidebarNav .nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            const view = link.dataset.view;
            if (view === "saved") {
                state.showSavedOnly = true;
                document.getElementById("dashboardTitle").textContent = "Saved Reading List";
                document.getElementById("feedSectionHeading").textContent = "Bookmarked Research Papers & Articles";
            } else {
                state.showSavedOnly = false;
                document.getElementById("dashboardTitle").textContent = "Main Trend Dashboard";
                document.getElementById("feedSectionHeading").textContent = "Categorized Research & Tech News Feed";
                if (view !== "dashboard") {
                    showToast(`Switched preview context: ${link.textContent.trim()}`);
                }
            }
            updateDashboard();
        });
    });

    // KPI "View Saved" shortcut button
    document.getElementById("toggleSavedOnlyBtn").addEventListener("click", () => {
        state.showSavedOnly = !state.showSavedOnly;
        const targetView = state.showSavedOnly ? "saved" : "dashboard";
        document.querySelectorAll("#sidebarNav .nav-link").forEach(l => {
            l.classList.toggle("active", l.dataset.view === targetView);
        });
        document.getElementById("dashboardTitle").textContent = state.showSavedOnly
            ? "Saved Reading List"
            : "Main Trend Dashboard";
        updateDashboard();
    });

    // Reset Filters
    document.getElementById("resetFiltersBtn").addEventListener("click", () => {
        document.getElementById("categoryFilter").value = "All";
        document.getElementById("timeFilter").value = "all";
        document.getElementById("globalSearchInput").value = "";
        document.getElementById("srcAll").checked = true;
        state.showSavedOnly = false;

        document.querySelectorAll("#sidebarNav .nav-link").forEach(l => {
            l.classList.toggle("active", l.dataset.view === "dashboard");
        });
        document.getElementById("dashboardTitle").textContent = "Main Trend Dashboard";

        // Reset trend checkboxes to default 3
        document.getElementById("kwAgentic").checked = true;
        document.getElementById("kwQuantum").checked = true;
        document.getElementById("kwEdge").checked = true;
        document.getElementById("kwCrypto").checked = false;

        renderLineChart();
        updateDashboard();
        showToast("All filters reset to default view.");
    });
}

// --- FILTERING & MASTER REFRESH ---
function getFilteredArticles() {
    const category = document.getElementById("categoryFilter").value;
    const days = document.getElementById("timeFilter").value;
    const search = document.getElementById("globalSearchInput").value.trim().toLowerCase();
    const sourceType = document.querySelector('input[name="sourceTypeFilter"]:checked').value;

    return state.articles.filter(article => {
        if (state.showSavedOnly && !state.savedIds.has(article.id)) return false;
        if (category !== "All" && article.category !== category) return false;
        if (sourceType !== "All" && article.sourceType !== sourceType) return false;

        if (days !== "all") {
            const pubDate = new Date(article.date + "T00:00:00");
            const diffDays = (REFERENCE_DATE - pubDate) / (1000 * 60 * 60 * 24);
            if (diffDays > parseInt(days, 10)) return false;
        }

        if (search) {
            const inTitle = article.title.toLowerCase().includes(search);
            const inSummary = article.summary.toLowerCase().includes(search);
            const inKeywords = article.keywords.some(k => k.toLowerCase().includes(search));
            if (!inTitle && !inSummary && !inKeywords) return false;
        }

        return true;
    });
}

function updateDashboard() {
    const filtered = getFilteredArticles();
    updateKPIs(filtered);
    renderBarChart(filtered);
    renderArticles(filtered);
}

// --- UPDATE 4 KPI CARDS ---
function updateKPIs(filtered) {
    // 1. Articles Analyzed
    document.getElementById("kpiArticlesCount").textContent = filtered.length;
    const paperCount = filtered.filter(a => a.sourceType === "Research Paper").length;
    const newsCount = filtered.filter(a => a.sourceType === "Tech News").length;
    document.getElementById("kpiSourceSplit").textContent = `${paperCount} Papers • ${newsCount} News`;

    // 2. Top Emerging Keyword
    const kwFreq = {};
    filtered.forEach(a => a.keywords.forEach(k => kwFreq[k] = (kwFreq[k] || 0) + 1));
    const sortedKws = Object.keys(kwFreq).sort((a, b) => kwFreq[b] - kwFreq[a]);

    if (sortedKws.length > 0) {
        const topKw = sortedKws[0];
        const growth = state.trendSeries.keywords[topKw]?.growth || "+24.5%";
        document.getElementById("kpiTopKeyword").textContent = topKw;
        document.getElementById("kpiKeywordGrowth").textContent = growth;
    } else {
        document.getElementById("kpiTopKeyword").textContent = "N/A";
        document.getElementById("kpiKeywordGrowth").textContent = "0%";
    }

    // 3. Most Active Category
    if (filtered.length > 0) {
        const catCounts = {};
        filtered.forEach(a => catCounts[a.category] = (catCounts[a.category] || 0) + 1);
        const topCat = Object.keys(catCounts).reduce((a, b) => catCounts[a] >= catCounts[b] ? a : b);
        const sharePct = Math.round((catCounts[topCat] / filtered.length) * 100);
        document.getElementById("kpiTopCategory").textContent = topCat;
        document.getElementById("kpiCategoryShare").textContent = `${sharePct}% share`;
    } else {
        document.getElementById("kpiTopCategory").textContent = "N/A";
        document.getElementById("kpiCategoryShare").textContent = "0%";
    }

    // 4. Saved Reading Items
    document.getElementById("kpiSavedCount").textContent = state.savedIds.size;
    document.getElementById("navSavedBadge").textContent = state.savedIds.size;
    document.getElementById("toggleSavedOnlyBtn").textContent = state.showSavedOnly ? "Show All" : "View Saved";
}

// --- MULTI-LINE TREND COMPARISON CHART ---
function renderLineChart() {
    const selectedKeywords = Array.from(document.querySelectorAll(".kw-toggle:checked")).map(cb => cb.value);
    const datasets = selectedKeywords.map(kw => {
        const series = state.trendSeries.keywords[kw];
        return {
            label: kw,
            data: series.data,
            borderColor: series.color,
            backgroundColor: series.color + "22",
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });

    const ctx = document.getElementById("trendLineChart").getContext("2d");
    if (lineChart) lineChart.destroy();

    lineChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: state.trendSeries.labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#e6edf3", usePointStyle: true, padding: 16 }
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
    const kwCounts = {};
    filtered.forEach(article => {
        article.keywords.forEach(kw => {
            kwCounts[kw] = (kwCounts[kw] || 0) + 1;
        });
    });

    const labels = Object.keys(kwCounts).sort((a, b) => kwCounts[b] - kwCounts[a]).slice(0, 7);
    const values = labels.map(l => kwCounts[l]);

    const ctx = document.getElementById("keywordBarChart").getContext("2d");
    if (barChart) barChart.destroy();

    barChart = new Chart(ctx, {
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
                    ticks: { color: "#e6edf3" },
                    grid: { display: false }
                }
            }
        }
    });
}

// --- ARTICLE CARDS & ACADEMIC ACTIONS ---
function renderArticles(articles) {
    const container = document.getElementById("articlesFeedContainer");
    document.getElementById("feedCountBadge").textContent = articles.length;

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

    container.innerHTML = articles.map(article => {
        const isSaved = state.savedIds.has(article.id);
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
                            <i class="bi bi-calendar3 me-1"></i>${article.date} • ${article.venue}
                        </span>
                    </div>

                    <!-- Academic Action Buttons -->
                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <button
                            class="btn btn-sm ${isSaved ? "btn-warning" : "btn-outline-secondary"}"
                            onclick="toggleBookmark('${article.id}')"
                            title="Save to Reading List"
                        >
                            <i class="bi ${isSaved ? "bi-bookmark-fill" : "bi-bookmark"} me-1"></i>
                            ${isSaved ? "Saved" : "Save"}
                        </button>

                        <button
                            class="btn btn-sm btn-outline-secondary"
                            onclick="copyCitation('${article.id}')"
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
                        ${article.keywords.map(kw => `
                            <span class="keyword-pill" onclick="filterByKeyword('${kw}')">#${kw}</span>
                        `).join("")}
                    </div>
                    <span class="text-secondary small fst-italic">Authors: ${article.authors}</span>
                </div>
            </article>
        `;
    }).join("");
}

// --- INTERACTIVE ACADEMIC HELPERS ---
window.toggleBookmark = function(articleId) {
    if (state.savedIds.has(articleId)) {
        state.savedIds.delete(articleId);
        showToast("Removed from Saved Reading List.");
    } else {
        state.savedIds.add(articleId);
        showToast("Saved to Reading List.");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.savedIds)));
    updateDashboard();
};

window.copyCitation = function(articleId) {
    const article = state.articles.find(a => a.id === articleId);
    if (!article) return;

    const year = article.date.slice(0, 4);
    const citation = `${article.authors} (${year}). "${article.title}." ${article.venue}. Available at: ${article.url}`;

    navigator.clipboard.writeText(citation).then(() => {
        showToast("Citation copied to clipboard!");
    }).catch(() => {
        showToast("Unable to access clipboard.");
    });
};

window.filterByKeyword = function(keyword) {
    const searchInput = document.getElementById("globalSearchInput");
    searchInput.value = keyword;
    updateDashboard();
    showToast(`Filtered by keyword: #${keyword}`);
};

function showToast(message) {
    document.getElementById("toastMessage").innerHTML = `
        <i class="bi bi-check-circle-fill text-success"></i>
        <span>${message}</span>
    `;
    toastInstance.show();
}