/**
 * Emerging Technology Trend Identifier - Shared State, API Fetcher & Helpers
 * Shared across index.html, feeds.html, saved.html, and settings.html.
 */

const STORAGE_KEYS = {
    SAVED_IDS: "etti_saved_article_ids",
    SETTINGS: "etti_user_settings",
    FEEDS: "etti_data_feeds"
};

const DEFAULT_SETTINGS = {
    apiBaseUrl: "http://127.0.0.1:8000/api",
    apiTimeoutMs: 5000,
    useLiveApi: false,
    defaultCategory: "All",
    defaultTimePeriod: "all",
    defaultSourceType: "All",
    itemsPerPage: 10
    uiTheme: "dark",
    cardDensity: "comfortable",
    enableChartAnimations: true,
    defaultCitationStyle: "APA",
    showSummariesByDefault: true,
};

const DEFAULT_FEEDS = [
    {
        id: "arxiv",
        name: "arXiv Computer Science Preprints",
        type: "Research Paper",
        endpoint: "https://export.arxiv.org/api/query",
        active: true,
        interval: "Every 6 hours",
        lastSync: "15 mins ago",
        count: 142
    },
    {
        id: "ieee",
        name: "IEEE Spectrum & Digital Library",
        type: "Research Paper",
        endpoint: "https://ieeexploreapi.ieee.org/api/v1",
        active: true,
        interval: "Every 12 hours",
        lastSync: "1 hour ago",
        count: 89
    },
    {
        id: "acm",
        name: "ACM TechNews Curated Feed",
        type: "Tech News",
        endpoint: "https://cacm.acm.org/api/feed",
        active: true,
        interval: "Every 3 hours",
        lastSync: "25 mins ago",
        count: 64
    },
    {
        id: "hn",
        name: "Hacker News Engineering Trends",
        type: "Tech News",
        endpoint: "https://hn.algolia.com/api/v1",
        active: false,
        interval: "Every 1 hour",
        lastSync: "Paused",
        count: 0
    }
];

// Curated Mock Dataset (Fallback when offline or before Python backend is connected)
const CURATED_DATA = {
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
            "Agentic AI": {
                data: [48, 66, 92, 124, 165, 218],
                growth: "+32.1%",
                color: "#58a6ff"
            },
            "Quantum Error Correction": {
                data: [28, 34, 41, 55, 72, 96],
                growth: "+33.3%",
                color: "#a371f7"
            },
            "Neuromorphic Edge": {
                data: [30, 39, 51, 64, 79, 102],
                growth: "+29.1%",
                color: "#3fb950"
            },
            "Post-Quantum Crypto": {
                data: [42, 47, 53, 68, 84, 109],
                growth: "+29.8%",
                color: "#f78166"
            }
        }
    }
};

// --- BOOKMARKS / SAVED READING LIST STATE ---
function getSavedIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.SAVED_IDS);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function saveIds(idSet) {
    localStorage.setItem(STORAGE_KEYS.SAVED_IDS, JSON.stringify(Array.from(idSet)));
    updateNavSavedBadge();
}

function toggleSavedArticleId(articleId) {
    const ids = getSavedIds();
    let isSavedNow = false;
    if (ids.has(articleId)) {
        ids.delete(articleId);
        isSavedNow = false;
    } else {
        ids.add(articleId);
        isSavedNow = true;
    }
    saveIds(ids);
    return isSavedNow;
}

function updateNavSavedBadge() {
    const badge = document.getElementById("navSavedBadge");
    if (badge) {
        badge.textContent = getSavedIds().size;
    }
}

// --- SETTINGS STATE ---
function getSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings(newSettings) {
    const merged = { ...DEFAULT_SETTINGS, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
}

function resetSettingsToDefault() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS };
}

// --- DATA FEEDS STATE ---
function getFeeds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.FEEDS);
        return raw ? JSON.parse(raw) : [...DEFAULT_FEEDS];
    } catch {
        return [...DEFAULT_FEEDS];
    }
}

function saveFeeds(feeds) {
    localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(feeds));
}

// --- API FETCHER WITH CURATED FALLBACK ---
async function fetchDashboardPayload() {
    const settings = getSettings();
    const baseUrl = (settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl).replace(/\/+$/, "");

    if (!settings.useLiveApi) {
        return {
            data: CURATED_DATA,
            sourceMode: "curated",
            fallbackReason: null
        };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), settings.apiTimeoutMs || 5000);

    try {
        const response = await fetch(`${baseUrl}/dashboard`, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        return {
            data: {
                articles: Array.isArray(json.articles) ? json.articles : CURATED_DATA.articles,
                trendSeries: json.trendSeries || CURATED_DATA.trendSeries
            },
            sourceMode: "live",
            fallbackReason: null
        };
    } catch (error) {
        clearTimeout(timeoutId);
        return {
            data: CURATED_DATA,
            sourceMode: "curated",
            fallbackReason: error.message || "Backend unreachable"
        };
    }
}

async function pingBackendApi(customBaseUrl = null) {
    const settings = getSettings();
    const baseUrl = ((customBaseUrl ?? settings.apiBaseUrl) || DEFAULT_SETTINGS.apiBaseUrl).replace(/\/+$/, "");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), settings.apiTimeoutMs || 5000);

    try {
        const response = await fetch(`${baseUrl}/dashboard`, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return {
            ok: response.ok,
            status: response.status,
            url: `${baseUrl}/dashboard`
        };
    } catch (error) {
        clearTimeout(timeoutId);
        return {
            ok: false,
            status: null,
            url: `${baseUrl}/dashboard`,
            error: error.message || "Connection failed"
        };
    }
}

// --- CITATION & UI HELPERS ---
function formatCitation(article, style = "APA") {
    const year = (article.date || "2026").slice(0, 4);
    const authors = article.authors || "Unknown Author";
    const venue = article.venue || article.sourceType || "Curated Source";

    if (style === "IEEE") {
        return `${authors}, "${article.title}," ${venue}, ${year}. [Online]. Available: ${article.url}`;
    }
    if (style === "BibTeX") {
        const key = (article.id || "ref").replace(/[^a-zA-Z0-9_]/g, "_");
        return `@article{${key}, title={${article.title}}, author={${authors}}, journal={${venue}}, year={${year}}, url={${article.url}}}`;
    }
    return `${authors} (${year}). ${article.title}. ${venue}. ${article.url}`;
}

function triggerToast(message, isError = false) {
    const toastEl = document.getElementById("actionToast");
    const msgEl = document.getElementById("toastMessage");
    if (!toastEl || !msgEl) return;

    const iconClass = isError
        ? "bi-exclamation-triangle-fill text-warning"
        : "bi-check-circle-fill text-success";

    msgEl.innerHTML = `<i class="bi ${iconClass}"></i><span>${message}</span>`;
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2500 }).show();
}

document.addEventListener("DOMContentLoaded", updateNavSavedBadge);

function applyUserTheme(themeOverride = null) {
    const settings = getSettings();
    const theme = themeOverride || settings.uiTheme || "dark";
    document.documentElement.setAttribute("data-bs-theme", theme);
    document.body.classList.toggle("density-compact", settings.cardDensity === "compact");
}

document.addEventListener("DOMContentLoaded", () => {
    applyUserTheme();
    updateNavSavedBadge();
});