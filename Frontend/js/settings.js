
// ========================================
// SETTINGS PAGE INITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    bindSettingsEvents();
    initDemoAuth();

    // Load preferences for the currently logged-in account.
    populateSettingsForm();

    updateNavSavedBadge();
    applyUserTheme();
});


// ========================================
// SETTINGS FORM
// ========================================

function populateSettingsForm() {
    const s = getSettings();

    const themeRadio = document.querySelector(
        `input[name="uiTheme"][value="${s.uiTheme || "dark"}"]`
    );

    if (themeRadio) {
        themeRadio.checked = true;
    }

    const densityEl = document.getElementById("cardDensity");
    if (densityEl) {
        densityEl.value = s.cardDensity || "comfortable";
    }

    const summaryEl = document.getElementById("showSummariesByDefault");
    if (summaryEl) {
        summaryEl.checked = s.showSummariesByDefault !== false;
    }

    const animEl = document.getElementById("enableChartAnimations");
    if (animEl) {
        animEl.checked = s.enableChartAnimations !== false;
    }

    const catEl = document.getElementById("defaultCategory");
    if (catEl) {
        catEl.value = s.defaultCategory || "All";
    }

    const timeEl = document.getElementById("defaultTimePeriod");
    if (timeEl) {
        timeEl.value = s.defaultTimePeriod || "all";
    }

    const citeEl = document.getElementById("defaultCitationStyle");
    if (citeEl) {
        citeEl.value = s.defaultCitationStyle || "APA";
    }

    applyUserTheme(s.uiTheme || "dark");
}


// ========================================
// SAVE SETTINGS
// ========================================

function bindSettingsEvents() {

    // Theme preview
    document.querySelectorAll('input[name="uiTheme"]').forEach(radio => {
        radio.addEventListener("change", () => {
            applyUserTheme(radio.value);
        });
    });

        // Auto-save preferences whenever a setting changes
    const autoSaveSettings = () => {
        const current = getSettings();

        const updated = saveSettings({
            ...current,

            uiTheme:
                document.querySelector('input[name="uiTheme"]:checked')?.value || "dark",

            cardDensity:
                document.getElementById("cardDensity")?.value || "comfortable",

            showSummariesByDefault: Boolean(
                document.getElementById("showSummariesByDefault")?.checked
            ),

            enableChartAnimations: Boolean(
                document.getElementById("enableChartAnimations")?.checked
            ),

            defaultCategory:
                document.getElementById("defaultCategory")?.value || "All",

            defaultTimePeriod:
                document.getElementById("defaultTimePeriod")?.value || "all",

            defaultCitationStyle:
                document.getElementById("defaultCitationStyle")?.value || "APA"
        });

        applyUserTheme(updated.uiTheme);
    };

    document.querySelectorAll(
        '#settingsForm input, #settingsForm select'
    ).forEach(control => {
        control.addEventListener("change", autoSaveSettings);
    });

    // Save Preferences
    document.getElementById("settingsForm")?.addEventListener("submit", (e) => {
        e.preventDefault();

        const current = getSettings();

        const selectedTheme =
            document.querySelector('input[name="uiTheme"]:checked')?.value || "dark";

        const updated = saveSettings({
            ...current,

            uiTheme: selectedTheme,

            cardDensity:
                document.getElementById("cardDensity")?.value || "comfortable",

            showSummariesByDefault: Boolean(
                document.getElementById("showSummariesByDefault")?.checked
            ),

            enableChartAnimations: Boolean(
                document.getElementById("enableChartAnimations")?.checked
            ),

            defaultCategory:
                document.getElementById("defaultCategory")?.value || "All",

            defaultTimePeriod:
                document.getElementById("defaultTimePeriod")?.value || "all",

            defaultCitationStyle:
                document.getElementById("defaultCitationStyle")?.value || "APA"
        });

        applyUserTheme(updated.uiTheme);

        triggerToast("Preferences saved successfully!");
    });


    // Reset Preferences
    document.getElementById("resetDefaultsBtn")?.addEventListener("click", () => {

        const current = getSettings();

        const defaults = saveSettings({
            ...DEFAULT_SETTINGS,

            // Preserve API configuration.
            apiBaseUrl: current.apiBaseUrl,
            apiTimeoutMs: current.apiTimeoutMs,
            useLiveApi: current.useLiveApi
        });

        populateSettingsForm();

        applyUserTheme(defaults.uiTheme);

        triggerToast("Preferences reset to defaults.");
    });
}


// ========================================
// DEMO LOGIN ACCOUNTS
// ========================================

const DEMO_ACCOUNTS = {
    student: {
        email: "student@demo.edu",
        password: "Student@123",
        name: "Student Demo",
        role: "Student",
        id: "STU-DEMO-001",
        department: "Computer Science & Engineering",
        college: "Demo University"
    },

    staff: {
        email: "faculty@demo.edu",
        password: "Faculty@123",
        name: "Professor Demo",
        role: "Teacher / Staff",
        id: "FAC-DEMO-001",
        department: "Computer Science & Engineering",
        college: "Demo University"
    }
};

const DEMO_SESSION_KEY = "ett_demo_user";


// ========================================
// AUTHENTICATION INITIALIZATION
// ========================================

function initDemoAuth() {

    const loginForm = document.getElementById("loginForm");

    loginForm?.addEventListener("submit", (e) => {
        e.preventDefault();

        const selectedRole = document.querySelector(
            'input[name="loginRole"]:checked'
        )?.value;

        const email = document.getElementById("loginIdentifier")
            ?.value.trim().toLowerCase();

        const password = document.getElementById("loginPassword")?.value;

        const account = DEMO_ACCOUNTS[selectedRole];

        if (
            !account ||
            email !== account.email ||
            password !== account.password
        ) {
            triggerToast("Invalid account type, email or password.");
            return;
        }

        // Store account identity only. Never store the password.
        localStorage.setItem(
            DEMO_SESSION_KEY,
            JSON.stringify({
                role: selectedRole,
                email: account.email
            })
        );

        // Update profile information.
        updateProfileHeader(account);

        // IMPORTANT:
        // Reload this account's own saved preferences.
        populateSettingsForm();

        // Update saved articles count for this account.
        updateNavSavedBadge();

        loginForm.reset();

        const loginModalElement = document.getElementById("loginModal");

        if (
            loginModalElement &&
            typeof bootstrap !== "undefined"
        ) {
            bootstrap.Modal
                .getOrCreateInstance(loginModalElement)
                .hide();
        }

        triggerToast("Welcome " + account.name + "!");
    });


    // Logout
    document.getElementById("logoutBtn")
        ?.addEventListener("click", logoutDemoUser);


    // View Profile
    document.getElementById("viewProfileBtn")
        ?.addEventListener("click", showDemoProfile);


    // Restore session after refresh.
    restoreDemoSession();
}


// ========================================
// RESTORE LOGIN SESSION
// ========================================

function restoreDemoSession() {

    try {
        const savedSession = JSON.parse(
            localStorage.getItem(DEMO_SESSION_KEY) || "null"
        );

        if (!savedSession) {
            return;
        }

        const account = DEMO_ACCOUNTS[savedSession.role];

        if (
            account &&
            account.email === savedSession.email
        ) {
            updateProfileHeader(account);
        } else {
            localStorage.removeItem(DEMO_SESSION_KEY);
        }

    } catch (error) {
        console.error("Unable to restore login session:", error);
        localStorage.removeItem(DEMO_SESSION_KEY);
    }
}


// ========================================
// UPDATE PROFILE HEADER
// ========================================

function updateProfileHeader(account) {

    const loginButton = document.getElementById("headerLoginBtn");
    const profileMenu = document.getElementById("headerProfileMenu");

    if (loginButton) {
        loginButton.hidden = true;
    }

    if (profileMenu) {
        profileMenu.hidden = false;
    }

    const headerName = document.getElementById("headerProfileName");
    const dropdownName = document.getElementById("dropdownProfileName");
    const dropdownEmail = document.getElementById("dropdownProfileEmail");
    const dropdownRole = document.getElementById("dropdownProfileRole");

    if (headerName) {
        headerName.textContent = account.name;
    }

    if (dropdownName) {
        dropdownName.textContent = account.name;
    }

    if (dropdownEmail) {
        dropdownEmail.textContent = account.email;
    }

    if (dropdownRole) {
        dropdownRole.textContent = account.role;
    }
}


// ========================================
// VIEW STUDENT / FACULTY PROFILE
// ========================================

function showDemoProfile() {

    let savedSession;

    try {
        savedSession = JSON.parse(
            localStorage.getItem(DEMO_SESSION_KEY) || "null"
        );
    } catch (error) {
        return;
    }

    if (!savedSession) {
        return;
    }

    const account = DEMO_ACCOUNTS[savedSession.role];

    if (!account || account.email !== savedSession.email) {
        return;
    }

    const profileFields = {
        profileDisplayName: account.name,
        profileDisplayRole: account.role,
        profileDisplayEmail: account.email,
        profileDisplayId: account.id,
        profileDisplayDepartment: account.department,
        profileDisplayCollege: account.college
    };

    Object.entries(profileFields).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    });

    const profileModalElement = document.getElementById("profileModal");

    if (
        profileModalElement &&
        typeof bootstrap !== "undefined"
    ) {
        bootstrap.Modal
            .getOrCreateInstance(profileModalElement)
            .show();
    }
}


// ========================================
// LOGOUT
// ========================================


function logoutDemoUser() {
    // Remove the active login session.
    localStorage.removeItem("ett_demo_user");

    // Return to the login page.
    window.location.replace("login.html");
}
