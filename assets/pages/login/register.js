const registerForm = document.querySelector("[data-register-form]");
const registerStatus = document.querySelector("[data-register-status]");
const registerSubmit = registerForm?.querySelector(".register-submit");
const registerDniInput = document.querySelector("#register-dni");
const registerPhoneInput = document.querySelector("#register-phone");
const registerPasswordToggles = document.querySelectorAll("[data-toggle-password]");

const registerApiUrl = "http://localhost:3000/api/auth/register";

const setRegisterStatus = (message, type = "error") => {
    if (!registerStatus) {
        return;
    }

    registerStatus.textContent = message;
    registerStatus.dataset.type = type;
};

const setRegisterLoading = (isLoading) => {
    if (!registerSubmit) {
        return;
    }

    registerSubmit.disabled = isLoading;
    registerSubmit.textContent = isLoading ? "Creando cuenta..." : "Crear Cuenta";
};

const cleanDigits = (input, maxLength) => {
    if (!input) {
        return;
    }

    input.value = input.value.replace(/\D/g, "").slice(0, maxLength);
};

const validateRegister = ({ nombre, email, dni, celular, password, confirmPassword, terms }) => {
    const namePattern = /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]+(?:\s+[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]+)*$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nombre || !email || !dni || !celular || !password || !confirmPassword) {
        return "Completa todos los campos para crear tu cuenta.";
    }

    if (!namePattern.test(nombre)) {
        return "El nombre solo puede tener letras y espacios.";
    }

    if (!emailPattern.test(email)) {
        return "Ingresa un correo electronico valido.";
    }

    if (!/^\d{8}$/.test(dni)) {
        return "Ingresa un DNI valido de 8 digitos.";
    }

    if (!/^9\d{8}$/.test(celular)) {
        return "Ingresa un celular peruano valido de 9 digitos que empiece con 9.";
    }

    if (password.length < 8) {
        return "La contrasena debe tener minimo 8 caracteres.";
    }

    if (password !== confirmPassword) {
        return "Las contrasenas no coinciden.";
    }

    if (!terms) {
        return "Acepta los terminos y condiciones para continuar.";
    }

    return "";
};

registerDniInput?.addEventListener("input", () => {
    cleanDigits(registerDniInput, 8);
});

registerPhoneInput?.addEventListener("input", () => {
    cleanDigits(registerPhoneInput, 9);
});

registerPasswordToggles.forEach((button) => {
    button.addEventListener("click", () => {
        const inputId = button.getAttribute("aria-controls");
        const input = inputId ? document.getElementById(inputId) : button.previousElementSibling;

        if (!input) {
            return;
        }

        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";
        button.classList.toggle("is-visible", !isVisible);
        button.setAttribute("aria-label", isVisible ? "Mostrar contrasena" : "Ocultar contrasena");
        input.focus();
    });
});

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const registerData = {
        nombre: String(formData.get("nombre") || "").trim().replace(/\s+/g, " "),
        email: String(formData.get("email") || "").trim().toLowerCase(),
        dni: String(formData.get("dni") || "").replace(/\D/g, ""),
        celular: String(formData.get("celular") || "").replace(/\D/g, ""),
        password: String(formData.get("password") || ""),
        confirmPassword: String(formData.get("confirmPassword") || ""),
        terms: formData.get("terms") === "on"
    };

    const validationMessage = validateRegister(registerData);

    if (validationMessage) {
        setRegisterStatus(validationMessage);
        return;
    }

    setRegisterLoading(true);
    setRegisterStatus("");

    try {
        const response = await fetch(registerApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre: registerData.nombre,
                email: registerData.email,
                dni: registerData.dni,
                celular: registerData.celular,
                contrasena: registerData.password,
                confirmarContrasena: registerData.confirmPassword
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudo crear la cuenta.");
        }

        setRegisterStatus("Cuenta creada correctamente. Redirigiendo...", "success");
        registerForm.reset();

        setTimeout(() => {
            window.location.href = payload.redirectUrl || "/assets/pages/login/";
        }, 900);
    } catch (error) {
        setRegisterStatus(error.message || "No se pudo crear la cuenta. Revisa tus datos.");
    } finally {
        setRegisterLoading(false);
    }
});
