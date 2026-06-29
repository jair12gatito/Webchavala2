const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const passwordInput = document.querySelector("#login-password");
const passwordToggle = document.querySelector("[data-toggle-password]");
const loginSubmit = loginForm?.querySelector(".login-submit");

const loginApiUrl = "http://localhost:3000/api/auth/login";
const sessionMaxIdleMs = 30 * 60 * 1000;

const saveUserSession = (user) => {
    const now = Date.now();

    sessionStorage.removeItem("chavalaUser");
    sessionStorage.removeItem("chavalaLastActivity");
    sessionStorage.removeItem("chavalaExpiresAt");
    localStorage.removeItem("chavalaUser");
    localStorage.removeItem("chavalaLastActivity");
    localStorage.removeItem("chavalaExpiresAt");

    localStorage.setItem("chavalaUser", JSON.stringify(user || {}));
    localStorage.setItem("chavalaLastActivity", String(now));
    localStorage.setItem("chavalaExpiresAt", String(now + sessionMaxIdleMs));
};

const setLoginStatus = (message, type = "error") => {
    if (!loginStatus) {
        return;
    }

    loginStatus.textContent = message;
    loginStatus.dataset.type = type;
};

const setLoading = (isLoading) => {
    if (!loginSubmit) {
        return;
    }

    loginSubmit.disabled = isLoading;
    loginSubmit.classList.toggle("is-loading", isLoading);
    loginSubmit.textContent = isLoading ? "Ingresando..." : "Iniciar Sesion";
};

passwordToggle?.addEventListener("click", () => {
    if (!passwordInput) {
        return;
    }

    const shouldShowPassword = passwordInput.type === "password";
    passwordInput.type = shouldShowPassword ? "text" : "password";
    passwordToggle.classList.toggle("is-visible", shouldShowPassword);
    passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Ocultar contrasena" : "Mostrar contrasena");
    passwordInput.focus();
});

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
        setLoginStatus("Completa tu correo y contrasena.");
        return;
    }

    setLoading(true);
    setLoginStatus("");

    try {
        const response = await fetch(loginApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudo iniciar sesion.");
        }

        setLoginStatus("Sesion iniciada. Redirigiendo...", "success");
        saveUserSession(payload.user || {});
        window.location.href = payload.redirectUrl || "/assets/pages/catalog/catalog.html";
    } catch (error) {
        setLoginStatus(error.message || "No se pudo iniciar sesion. Revisa tus datos.");
    } finally {
        setLoading(false);
    }
});
