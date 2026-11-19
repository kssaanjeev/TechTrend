/**
 * Emerging Technology Trend Identifier - Settings & Backend API Config Logic
 * Saves API endpoint settings, timeout, source toggle, and default dashboard filters.
 */

document.addEventListener("DOMContentLoaded", () => {
    updateNavSavedBadge();
    populateSettingsForm();
    bindSettingsEvents();
});

function populateSettingsForm() {
    const settings = getSettings();

    const urlInput = document.getElementById("apiBaseUrl");
    const timeoutInput = document.getElementById("apiTimeoutMs");
    const liveToggle = document.getElementById("useLiveApi");
    const catSelect = document.getElementById("defaultCategory");
    const timeSelect = document.getElementById("defaultTimePeriod");
    const srcSelect = document.getElementById("defaultSourceType");

    if (urlInput) urlInput.value = settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl;
    if (timeoutInput) timeoutInput.value = settings.apiTimeoutMs || DEFAULT_SETTINGS.apiTimeoutMs;
    if (liveToggle) liveToggle.checked = Boolean(settings.useLiveApi);

    if (catSelect && settings.defaultCategory) {
        const hasCat = Array.from(catSelect.options).some(opt => opt.value === settings.defaultCategory);
        if (hasCat) catSelect.value = settings.defaultCategory;
    }

    if (timeSelect && settings.defaultTimePeriod) {
        const hasTime = Array.from(timeSelect.options).some(opt => opt.value === settings.defaultTimePeriod);
        if (hasTime) timeSelect.value = settings.defaultTimePeriod;
    }

    if (srcSelect && settings.defaultSourceType) {
        const hasSrc = Array.from(srcSelect.options).some(opt => opt.value === settings.defaultSourceType);
        if (hasSrc) srcSelect.value = settings.defaultSourceType;
    }

    updateApiModeBadge(Boolean(settings.useLiveApi), settings.apiBaseUrl);
}

function updateApiModeBadge(useLiveApi, apiBaseUrl) {
    const badge = document.getElementById("apiModeBadge");
    if (!badge) return;

    if (useLiveApi) {
        badge.innerHTML = `<i class="bi bi-broadcast text-success me-1"></i> Mode: Live Backend (${escapeSettingsHtml(apiBaseUrl || "")})`;
    } else {
        badge.innerHTML = `<i class="bi bi-hdd-stack text-info me-1"></i> Mode: Curated Offline Data`;
    }
}

function bindSettingsEvents() {
    const form = document.getElementById("settingsForm");
    const resetBtn = document.getElementById("resetDefaultsBtn");
    const testBtn = document.getElementById("testBackendBtn");
    const liveToggle = document.getElementById("useLiveApi");
    const urlInput = document.getElementById("apiBaseUrl");

    liveToggle?.addEventListener("change", () => {
        updateApiModeBadge(liveToggle.checked, urlInput?.value.trim());
    });

    urlInput?.addEventListener("input", () => {
        updateApiModeBadge(Boolean(liveToggle?.checked), urlInput.value.trim());
    });

    form?.addEventListener("submit", (e) => {
        e.preventDefault();

        const rawUrl = (urlInput?.value || "").trim() || DEFAULT_SETTINGS.apiBaseUrl;
        const rawTimeout = parseInt(document.getElementById("apiTimeoutMs")?.value || "5000", 10);
        const validTimeout = Number.isFinite(rawTimeout) && rawTimeout >= 1000 ? rawTimeout : DEFAULT_SETTINGS.apiTimeoutMs;

        const updated = saveSettings({
            apiBaseUrl: rawUrl.replace(/\/+$/, ""),
            apiTimeoutMs: validTimeout,
            useLiveApi: Boolean(liveToggle?.checked),
            defaultCategory: document.getElementById("defaultCategory")?.value || "All",
            defaultTimePeriod: document.getElementById("defaultTimePeriod")?.value || "all",
            defaultSourceType: document.getElementById("defaultSourceType")?.value || "All"
        });

        populateSettingsForm();
        triggerToast(`Settings saved (${updated.useLiveApi ? "Live Python API" : "Curated Data"}).`);
    });

    resetBtn?.addEventListener("click", () => {
        const defaults = resetSettingsToDefault();
        populateSettingsForm();
        updateApiModeBadge(defaults.useLiveApi, defaults.apiBaseUrl);
        triggerToast("Settings restored to defaults.");
    });

    testBtn?.addEventListener("click", async () => {
        const candidateUrl = (urlInput?.value || "").trim() || DEFAULT_SETTINGS.apiBaseUrl;
        triggerToast(`Testing connection to ${candidateUrl}/dashboard...`);

        const result = await pingBackendApi(candidateUrl);
        if (result.ok) {
            triggerToast(`Backend reachable (${result.status} OK) at ${result.url}`);
        } else {
            const reason = result.status ? `HTTP ${result.status}` : (result.error || "Unreachable");
            triggerToast(`Backend check failed (${reason}). Dashboard will use curated fallback if live mode is on.`, true);
        }
    });
}

function escapeSettingsHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}