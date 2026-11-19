/**
 * Emerging Technology Trend Identifier - Appearance & Reading Preferences
 */

document.addEventListener("DOMContentLoaded", () => {
    updateNavSavedBadge();
    populateSettingsForm();
    bindSettingsEvents();
});

function populateSettingsForm() {
    const s = getSettings();

    const themeRadio = document.querySelector(`input[name="uiTheme"][value="${s.uiTheme || "dark"}"]`);
    if (themeRadio) themeRadio.checked = true;

    const densityEl = document.getElementById("cardDensity");
    if (densityEl) densityEl.value = s.cardDensity || "comfortable";

    const summaryEl = document.getElementById("showSummariesByDefault");
    if (summaryEl) summaryEl.checked = s.showSummariesByDefault !== false;

    const animEl = document.getElementById("enableChartAnimations");
    if (animEl) animEl.checked = s.enableChartAnimations !== false;

    const catEl = document.getElementById("defaultCategory");
    if (catEl) catEl.value = s.defaultCategory || "All";

    const timeEl = document.getElementById("defaultTimePeriod");
    if (timeEl) timeEl.value = s.defaultTimePeriod || "all";

    const citeEl = document.getElementById("defaultCitationStyle");
    if (citeEl) citeEl.value = s.defaultCitationStyle || "APA";
}

function bindSettingsEvents() {
    // Live preview when switching Dark / Light theme
    document.querySelectorAll('input[name="uiTheme"]').forEach(radio => {
        radio.addEventListener("change", () => {
            if (typeof applyUserTheme === "function") {
                applyUserTheme(radio.value);
            }
        });
    });

    document.getElementById("settingsForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const current = getSettings();
        const selectedTheme = document.querySelector('input[name="uiTheme"]:checked')?.value || "dark";

        const updated = saveSettings({
            ...current,
            uiTheme: selectedTheme,
            cardDensity: document.getElementById("cardDensity")?.value || "comfortable",
            showSummariesByDefault: Boolean(document.getElementById("showSummariesByDefault")?.checked),
            enableChartAnimations: Boolean(document.getElementById("enableChartAnimations")?.checked),
            defaultCategory: document.getElementById("defaultCategory")?.value || "All",
            defaultTimePeriod: document.getElementById("defaultTimePeriod")?.value || "all",
            defaultCitationStyle: document.getElementById("defaultCitationStyle")?.value || "APA"
        });

        if (typeof applyUserTheme === "function") {
            applyUserTheme(updated.uiTheme);
        }
        triggerToast("Preferences saved.");
    });

    document.getElementById("resetDefaultsBtn")?.addEventListener("click", () => {
        const current = getSettings();
        const defaults = saveSettings({
            ...DEFAULT_SETTINGS,
            apiBaseUrl: current.apiBaseUrl,
            apiTimeoutMs: current.apiTimeoutMs,
            useLiveApi: current.useLiveApi
        });

        populateSettingsForm();
        if (typeof applyUserTheme === "function") {
            applyUserTheme(defaults.uiTheme);
        }
        triggerToast("Preferences reset to defaults.");
    });
}