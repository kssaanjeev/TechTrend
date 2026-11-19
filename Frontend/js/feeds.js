/**
 * Emerging Technology Trend Identifier - Data Sources & API Feeds Logic
 * Manages feed toggles, filtering, syncing, connection tests, and custom feeds.
 */

document.addEventListener("DOMContentLoaded", () => {
    updateNavSavedBadge();
    bindFeedEvents();
    renderFeeds();
});

function bindFeedEvents() {
    document.getElementById("feedTypeFilter")?.addEventListener("change", renderFeeds);
    document.getElementById("feedStatusFilter")?.addEventListener("change", renderFeeds);
    document.getElementById("feedSearchInput")?.addEventListener("input", renderFeeds);

    document.getElementById("resetFeedsFilterBtn")?.addEventListener("click", () => {
        const typeEl = document.getElementById("feedTypeFilter");
        const statusEl = document.getElementById("feedStatusFilter");
        const searchEl = document.getElementById("feedSearchInput");

        if (typeEl) typeEl.value = "All";
        if (statusEl) statusEl.value = "All";
        if (searchEl) searchEl.value = "";

        renderFeeds();
        triggerToast("Feed filters reset.");
    });

    document.getElementById("syncAllBtn")?.addEventListener("click", () => {
        const nowLabel = "Just now";
        const updated = getFeeds().map(feed =>
            feed.active
                ? { ...feed, lastSync: nowLabel, count: (feed.count || 0) + 3 }
                : feed
        );
        saveFeeds(updated);
        renderFeeds();
        triggerToast("All active data feeds synced.");
    });

    document.getElementById("addFeedForm")?.addEventListener("submit", (e) => {
        e.preventDefault();

        const nameInput = document.getElementById("feedName");
        const typeInput = document.getElementById("feedType");
        const urlInput = document.getElementById("feedUrl");

        const name = nameInput?.value.trim();
        const type = typeInput?.value || "Research Paper";
        const endpoint = urlInput?.value.trim();

        if (!name || !endpoint) return;

        const feeds = getFeeds();
        feeds.push({
            id: `feed-${Date.now()}`,
            name,
            type,
            endpoint,
            active: true,
            interval: "Every 6 hours",
            lastSync: "Just now",
            count: 18
        });

        saveFeeds(feeds);
        e.target.reset();
        renderFeeds();
        triggerToast(`Added feed: ${name}`);
    });
}

function getFilteredFeeds() {
    const feeds = getFeeds();
    const typeFilter = document.getElementById("feedTypeFilter")?.value || "All";
    const statusFilter = document.getElementById("feedStatusFilter")?.value || "All";
    const search = (document.getElementById("feedSearchInput")?.value || "").trim().toLowerCase();

    return feeds.filter(feed => {
        if (typeFilter !== "All" && feed.type !== typeFilter) return false;

        const currentStatus = feed.active ? "Active" : "Paused";
        if (statusFilter !== "All" && currentStatus !== statusFilter) return false;

        if (search) {
            const inName = (feed.name || "").toLowerCase().includes(search);
            const inEndpoint = (feed.endpoint || "").toLowerCase().includes(search);
            const inType = (feed.type || "").toLowerCase().includes(search);
            if (!inName && !inEndpoint && !inType) return false;
        }

        return true;
    });
}

function renderFeeds() {
    const grid = document.getElementById("feedsGrid");
    const activeCountEl = document.getElementById("activeFeedsCount");
    const allFeeds = getFeeds();

    if (activeCountEl) {
        activeCountEl.textContent = allFeeds.filter(f => f.active).length;
    }

    if (!grid) return;

    const filteredFeeds = getFilteredFeeds();

    if (filteredFeeds.length === 0) {
        grid.innerHTML = `
            <div class="col-12">
                <div class="card dashboard-card">
                    <div class="card-body text-center py-5 text-secondary">
                        <i class="bi bi-rss fs-2 d-block mb-2"></i>
                        <p class="fw-semibold mb-1">No data sources match your current filter.</p>
                        <p class="small mb-0">Add a custom feed below or reset the feed filters.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredFeeds.map(feed => {
        const typeBadgeClass = feed.type === "Research Paper" ? "source-pill-paper" : "source-pill-news";
        const typeIcon = feed.type === "Research Paper" ? "bi-journal-text" : "bi-newspaper";
        const statusText = feed.active ? "Active" : "Paused";
        const statusClass = feed.active ? "text-success" : "text-warning";

        return `
            <div class="col-md-6">
                <div class="card dashboard-card h-100">
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <div>
                                    <span class="badge ${typeBadgeClass} mb-1">
                                        <i class="bi ${typeIcon} me-1"></i>${feed.type}
                                    </span>
                                    <h5 class="fw-bold mb-0">${escapeHtml(feed.name)}</h5>
                                </div>

                                <div class="form-check form-switch" title="Toggle feed active status">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        ${feed.active ? "checked" : ""}
                                        onchange="handleToggleFeed('${feed.id}')"
                                    >
                                </div>
                            </div>

                            <p class="text-secondary small text-break mb-3">
                                <code>${escapeHtml(feed.endpoint)}</code>
                            </p>
                        </div>

                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 small text-secondary border-top border-secondary-subtle pt-3">
                            <div>
                                Status: <strong class="${statusClass}">${statusText}</strong>
                                • Synced: <span>${escapeHtml(feed.lastSync || "Never")}</span>
                                • Items: <strong>${feed.count ?? 0}</strong>
                            </div>

                            <div class="d-flex gap-2">
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-primary"
                                    onclick="handleTestFeed('${feed.id}')"
                                >
                                    <i class="bi bi-plug me-1"></i>Test API
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-danger"
                                    onclick="handleDeleteFeed('${feed.id}')"
                                    title="Remove feed"
                                >
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

window.handleToggleFeed = function(feedId) {
    let toggledFeed = null;
    const updated = getFeeds().map(feed => {
        if (feed.id === feedId) {
            const nextActive = !feed.active;
            toggledFeed = {
                ...feed,
                active: nextActive,
                lastSync: nextActive ? "Just now" : "Paused"
            };
            return toggledFeed;
        }
        return feed;
    });

    saveFeeds(updated);
    renderFeeds();

    if (toggledFeed) {
        triggerToast(`${toggledFeed.name} ${toggledFeed.active ? "enabled" : "paused"}.`);
    }
};

window.handleTestFeed = async function(feedId) {
    const feed = getFeeds().find(f => f.id === feedId);
    if (!feed) return;

    triggerToast(`Testing connection to ${feed.name}...`);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        await fetch(feed.endpoint, { mode: "no-cors", signal: controller.signal });
        clearTimeout(timer);
        triggerToast(`${feed.name} endpoint is reachable.`);
    } catch {
        triggerToast(`${feed.name} could not be reached directly (check CORS or backend proxy).`, true);
    }
};

window.handleDeleteFeed = function(feedId) {
    const updated = getFeeds().filter(feed => feed.id !== feedId);
    saveFeeds(updated);
    renderFeeds();
    triggerToast("Feed removed.");
};

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}