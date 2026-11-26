
(function () {
    const SESSION_KEY = "ett_demo_user";

    const VALID_ACCOUNTS = {
        student: "student@demo.edu",
        staff: "faculty@demo.edu"
    };

    try {
        const session = JSON.parse(
            localStorage.getItem(SESSION_KEY) || "null"
        );

        const expectedEmail = VALID_ACCOUNTS[session?.role];

        if (!expectedEmail || session.email !== expectedEmail) {
            localStorage.removeItem(SESSION_KEY);
            window.location.replace("login.html");
        }
    } catch (error) {
        localStorage.removeItem(SESSION_KEY);
        window.location.replace("login.html");
    }
})();
