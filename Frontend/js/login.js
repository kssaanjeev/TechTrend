
const DEMO_ACCOUNTS = {
    student: {
        email: "student@demo.edu",
        password: "Student@123"
    },

    staff: {
        email: "faculty@demo.edu",
        password: "Faculty@123"
    }
};

document.addEventListener("DOMContentLoaded", () => {

    // If already logged in, go directly to Dashboard.
    const savedSession = localStorage.getItem("ett_demo_user");

    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            const account = DEMO_ACCOUNTS[session.role];

            if (account && account.email === session.email) {
                window.location.replace("index.html");
                return;
            }

            localStorage.removeItem("ett_demo_user");

        } catch (error) {
            localStorage.removeItem("ett_demo_user");
        }
    }

    const loginForm = document.getElementById("loginForm");

    loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        const selectedRole = document.querySelector(
            'input[name="loginRole"]:checked'
        )?.value;

        const email = document.getElementById("loginIdentifier")
            ?.value.trim().toLowerCase();

        const password = document.getElementById("loginPassword")?.value;

        const account = DEMO_ACCOUNTS[selectedRole];

        const errorElement = document.getElementById("loginError");

        if (
            !account ||
            email !== account.email ||
            password !== account.password
        ) {
            errorElement.textContent =
                "Invalid account type, email or password.";

            errorElement.hidden = false;
            return;
        }

        localStorage.setItem(
            "ett_demo_user",
            JSON.stringify({
                role: selectedRole,
                email: account.email
            })
        );

        window.location.replace("index.html");
    });

});
