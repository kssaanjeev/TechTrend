
/**
 * TechTrend - Live Data Sources & API Feeds
 * Connects the feeds page to the Flask backend.
 */

let feedsState = [];
let feedsLoading = false;


// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
    updateNavSavedBadge();
    bindFeedEvents();
    await loadFeedsFromBackend();
});


// --------------------------------------------------
// API HELPERS
// --------------------------------------------------

function getFeedApiBase() {
    const settings = typeof getSettings === "function"
        ? getSettings()
        : {};

    const baseUrl = (
        settings.apiBaseUrl || "http://127.0.0.1:8000/api"
    ).replace(/\/+$/, "");

    return `${baseUrl}/feeds`;
}


async function feedApiRequest(path = "", options = {}) {
    const response = await fetch(`${getFeedApiBase()}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The backend returned an invalid response.");
    }

    if (!response.ok) {
        throw new Error(result.error || "Feed API request failed.");
    }

    return result;
}


// --------------------------------------------------
// LOAD FEEDS FROM BACKEND
// --------------------------------------------------

async function loadFeedsFromBackend() {
    if (feedsLoading) return;

    feedsLoading = true;

    try {
        const result = await feedApiRequest();

        feedsState = Array.isArray(result.feeds)
            ? result.feeds
            : [];

        renderFeeds();

    } catch (error) {
        console.error("Unable to load feeds:", error);

        feedsState = [];
        renderFeeds();

        triggerToast(
            "Could not load feeds. Check whether the Python backend is running.",
            true
        );

    } finally {
        feedsLoading = false;
    }
}


// --------------------------------------------------
// EVENT BINDING
// --------------------------------------------------

function bindFeedEvents() {
    document.getElementById("feedTypeFilter")
        ?.addEventListener("change", renderFeeds);

    document.getElementById("feedStatusFilter")
        ?.addEventListener("change", renderFeeds);

    document.getElementById("feedSearchInput")
        ?.addEventListener("input", renderFeeds);


    document.getElementById("resetFeedsFilterBtn")
        ?.addEventListener("click", () => {
            const typeEl = document.getElementById("feedTypeFilter");
            const statusEl = document.getElementById("feedStatusFilter");
            const searchEl = document.getElementById("feedSearchInput");

            if (typeEl) typeEl.value = "All";
            if (statusEl) statusEl.value = "All";
            if (searchEl) searchEl.value = "";

            renderFeeds();
            triggerToast("Feed filters reset.");
        });


    document.getElementById("syncAllBtn")
        ?.addEventListener("click", handleSyncAll);


    document.getElementById("addFeedForm")
        ?.addEventListener("submit", handleAddFeed);


    // Handle feed card buttons and switches
    document.getElementById("feedsGrid")
        ?.addEventListener("click", async (event) => {

            const testButton = event.target.closest(".test-feed-btn");
            const deleteButton = event.target.closest(".delete-feed-btn");

            if (testButton) {
                await handleTestFeed(testButton.dataset.feedId);
            }

            if (deleteButton) {
                await handleDeleteFeed(deleteButton.dataset.feedId);
            }
        });


    document.getElementById("feedsGrid")
        ?.addEventListener("change", async (event) => {

            const toggle = event.target.closest(".feed-toggle");

            if (toggle) {
                await handleToggleFeed(
                    toggle.dataset.feedId,
                    toggle.checked
                );
            }
        });
}


// --------------------------------------------------
// FILTER FEEDS
// --------------------------------------------------

function getFilteredFeeds() {
    const typeFilter =
        document.getElementById("feedTypeFilter")?.value || "All";

    const statusFilter =
        document.getElementById("feedStatusFilter")?.value || "All";

    const search = (
        document.getElementById("feedSearchInput")?.value || ""
    ).trim().toLowerCase();


    return feedsState.filter(feed => {

        if (typeFilter !== "All" && feed.type !== typeFilter) {
            return false;
        }

        const currentStatus = feed.active
            ? (feed.status === "Failed" ? "Failed" : "Active")
            : "Paused";

        if (statusFilter !== "All" && currentStatus !== statusFilter) {
            return false;
        }

        if (search) {
            const inName = (feed.name || "").toLowerCase().includes(search);
            const inEndpoint = (feed.endpoint || "").toLowerCase().includes(search);
            const inType = (feed.type || "").toLowerCase().includes(search);

            if (!inName && !inEndpoint && !inType) {
                return false;
            }
        }

        return true;
    });
}


// --------------------------------------------------
// RENDER FEEDS
// --------------------------------------------------

function formatSyncDate(value) {
    if (!value) return "Never";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}


function renderFeeds() {
    const grid = document.getElementById("feedsGrid");
    const activeCountEl = document.getElementById("activeFeedsCount");

    if (activeCountEl) {
        activeCountEl.textContent = feedsState.filter(
            feed => feed.active && feed.status !== "Failed"
        ).length;
    }

    if (!grid) return;

    const filteredFeeds = getFilteredFeeds();

    if (filteredFeeds.length === 0) {
        grid.innerHTML = `
            <div class="col-12">
                <div class="card dashboard-card">
                    <div class="card-body text-center py-5 text-secondary">
                        <i class="bi bi-rss fs-2 d-block mb-2"></i>
                        <p class="fw-semibold mb-1">
                            No data sources match your current filter.
                        </p>
                        <p class="small mb-0">
                            Add a custom feed below or reset the feed filters.
                        </p>
                    </div>
                </div>
            </div>
        `;
        return;
    }


    grid.innerHTML = filteredFeeds.map(feed => {

        const typeBadgeClass = feed.type === "Research Paper"
            ? "source-pill-paper"
            : "source-pill-news";

        const typeIcon = feed.type === "Research Paper"
            ? "bi-journal-text"
            : "bi-newspaper";

        const statusText = !feed.active
            ? "Paused"
            : (feed.status || "Active");

        const statusClass = statusText === "Active"
            ? "text-success"
            : statusText === "Failed"
                ? "text-danger"
                : "text-warning";

        const feedId = escapeHtml(feed.id);
        const isActive = Boolean(feed.active);

        return `
            <div class="col-md-6">
                <div class="card dashboard-card h-100">
                    <div class="card-body d-flex flex-column justify-content-between">

                        <div>
                            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <div>
                                    <span class="badge ${typeBadgeClass} mb-1">
                                        <i class="bi ${typeIcon} me-1"></i>
                                        ${escapeHtml(feed.type)}
                                    </span>

                                    <h5 class="fw-bold mb-0">
                                        ${escapeHtml(feed.name)}
                                    </h5>
                                </div>

                                <div class="form-check form-switch"
                                     title="Toggle feed active status">

                                    <input
                                        class="form-check-input feed-toggle"
                                        type="checkbox"
                                        role="switch"
                                        data-feed-id="${feedId}"
                                        ${isActive ? "checked" : ""}
                                    >
                                </div>
                            </div>

                            <p class="text-secondary small text-break mb-3">
                                <code>${escapeHtml(feed.endpoint)}</code>
                            </p>

                            ${feed.lastError ? `
                                <p class="text-danger small mb-2">
                                    ${escapeHtml(feed.lastError)}
                                </p>
                            ` : ""}
                        </div>

                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 small text-secondary border-top border-secondary-subtle pt-3">

                            <div>
                                Status:
                                <strong class="${statusClass}">
                                    ${escapeHtml(statusText)}
                                </strong>

                                • Synced:
                                <span>
                                    ${escapeHtml(formatSyncDate(feed.lastSync))}
                                </span>

                                • Items:
                                <strong>${Number(feed.count) || 0}</strong>
                            </div>

                            <div class="d-flex gap-2">

                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-primary test-feed-btn"
                                    data-feed-id="${feedId}"
                                >
                                    <i class="bi bi-plug me-1"></i>
                                    Test API
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-danger delete-feed-btn"
                                    data-feed-id="${feedId}"
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


// --------------------------------------------------
// ADD NEW FEED
// --------------------------------------------------

async function handleAddFeed(event) {
    event.preventDefault();

    const nameInput = document.getElementById("feedName");
    const typeInput = document.getElementById("feedType");
    const urlInput = document.getElementById("feedUrl");

    const name = nameInput?.value.trim();
    const type = typeInput?.value || "Research Paper";
    const endpoint = urlInput?.value.trim();

    if (!name || !endpoint) {
        triggerToast("Please enter a feed name and URL.", true);
        return;
    }

    const submitButton = event.submitter;

    if (submitButton) submitButton.disabled = true;

    triggerToast(`Connecting to ${name}...`);

    try {
        const result = await feedApiRequest("", {
            method: "POST",
            body: JSON.stringify({
                name,
                type,
                endpoint
            })
        });

        await loadFeedsFromBackend();

        event.target.reset();

        triggerToast(
            `${name} added successfully. ${result.feed.count} articles fetched.`
        );

    } catch (error) {
        console.error("Add feed failed:", error);
        triggerToast(error.message, true);

    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}


// --------------------------------------------------
// TEST FEED CONNECTION
// --------------------------------------------------

window.handleTestFeed = async function(feedId) {
    const feed = feedsState.find(item => item.id === feedId);

    if (!feed) return;

    triggerToast(`Testing connection to ${feed.name}...`);

    try {
        const result = await feedApiRequest("/test", {
            method: "POST",
            body: JSON.stringify({
                name: feed.name,
                type: feed.type,
                endpoint: feed.endpoint
            })
        });

        triggerToast(
            `${feed.name}: connection successful. ${result.articleCount} articles found.`
        );

    } catch (error) {
        console.error("Feed test failed:", error);
        triggerToast(error.message, true);
    }
};


// --------------------------------------------------
// SYNC ALL ACTIVE FEEDS
// --------------------------------------------------

async function handleSyncAll() {
    const button = document.getElementById("syncAllBtn");

    if (button) button.disabled = true;

    triggerToast("Synchronizing active feeds...");

    try {
        const result = await feedApiRequest("/sync", {
            method: "POST"
        });

        await loadFeedsFromBackend();

        const successful = (result.results || []).filter(
            item => item.success
        ).length;

        const failed = (result.results || []).length - successful;

        triggerToast(
            `Sync completed: ${successful} successful, ${failed} failed.`
        );

    } catch (error) {
        console.error("Feed sync failed:", error);
        triggerToast(error.message, true);

    } finally {
        if (button) button.disabled = false;
    }
}


// --------------------------------------------------
// PAUSE / ACTIVATE FEED
// --------------------------------------------------

window.handleToggleFeed = async function(feedId, active) {
    const toggle = document.querySelector(
        `.feed-toggle[data-feed-id="${feedId}"]`
    );

    if (toggle) toggle.disabled = true;

    try {
        await feedApiRequest(`/${encodeURIComponent(feedId)}`, {
            method: "PATCH",
            body: JSON.stringify({ active })
        });

        await loadFeedsFromBackend();

        const feed = feedsState.find(item => item.id === feedId);

        if (feed) {
            triggerToast(
                `${feed.name} ${active ? "activated" : "paused"}.`
            );
        }

    } catch (error) {
        console.error("Feed status update failed:", error);

        if (toggle) toggle.checked = !active;

        triggerToast(error.message, true);

    } finally {
        if (toggle) toggle.disabled = false;
    }
};


// --------------------------------------------------
// DELETE FEED
// --------------------------------------------------

window.handleDeleteFeed = async function(feedId) {
    const feed = feedsState.find(item => item.id === feedId);

    if (!feed) return;

    const confirmed = window.confirm(
        `Remove ${feed.name} and its stored articles?`
    );

    if (!confirmed) return;

    try {
        await feedApiRequest(`/${encodeURIComponent(feedId)}`, {
            method: "DELETE"
        });

        await loadFeedsFromBackend();

        triggerToast(`${feed.name} removed successfully.`);

    } catch (error) {
        console.error("Feed deletion failed:", error);
        triggerToast(error.message, true);
    }
};


// --------------------------------------------------
// HTML ESCAPING
// --------------------------------------------------

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
