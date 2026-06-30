const profileApiUrl = "https://webchavala2-3xja.onrender.com/api/usuarios/perfil";
const passwordApiUrl = "https://webchavala2-3xja.onrender.com/api/usuarios/password";
const purchasesApiUrl = "https://webchavala2-3xja.onrender.com/api/clientes/compras";
const accountNavLinks = document.querySelectorAll("[data-account-tab]");
const accountSections = document.querySelectorAll("[data-account-section]");
const profileForm = document.querySelector("[data-profile-form]");
const profileStatus = document.querySelector("[data-profile-status]");
const profileNameTitle = document.querySelector("[data-profile-name]");
const profileMessage = document.querySelector("[data-profile-message]");
const profileCancel = document.querySelector("[data-profile-cancel]");
const profileSubmit = profileForm?.querySelector(".profile-submit");
const nameInput = document.querySelector("#profile-name");
const emailInput = document.querySelector("#profile-email");
const dniInput = document.querySelector("#profile-dni");
const phoneInput = document.querySelector("#profile-phone");
const successModal = document.querySelector("[data-success-modal]");
const successTitle = document.querySelector("[data-success-title]");
const successMessage = document.querySelector("[data-success-message]");
const successClose = document.querySelector("[data-success-close]");
const passwordForm = document.querySelector("[data-password-form]");
const passwordStatus = document.querySelector("[data-password-status]");
const passwordCancel = document.querySelector("[data-password-cancel]");
const passwordSubmit = passwordForm?.querySelector(".password-submit");
const currentPasswordInput = document.querySelector("#current-password");
const newPasswordInput = document.querySelector("#new-password");
const confirmPasswordInput = document.querySelector("#confirm-password");
const passwordInputs = [currentPasswordInput, newPasswordInput, confirmPasswordInput].filter(Boolean);
const purchasesLoading = document.querySelector("[data-purchases-loading]");
const purchasesTable = document.querySelector("[data-purchases-table]");
const purchasesBody = document.querySelector("[data-purchases-body]");
const purchasesEmpty = document.querySelector("[data-purchases-empty]");

let originalProfile = null;
let successAction = null;
let purchasesLoaded = false;

const getAccountStoredUser = () => {
    const stored = localStorage.getItem("chavalaUser") || sessionStorage.getItem("chavalaUser");

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored);
    } catch (error) {
        localStorage.removeItem("chavalaUser");
        sessionStorage.removeItem("chavalaUser");
        return null;
    }
};

const updateStoredUser = (user) => {
    const targetStorage = localStorage.getItem("chavalaUser") ? localStorage : sessionStorage;
    targetStorage.setItem("chavalaUser", JSON.stringify(user));
};

const clearStoredUser = () => {
    localStorage.removeItem("chavalaUser");
    sessionStorage.removeItem("chavalaUser");
    localStorage.removeItem("chavalaLastActivity");
    sessionStorage.removeItem("chavalaLastActivity");
    localStorage.removeItem("chavalaExpiresAt");
    sessionStorage.removeItem("chavalaExpiresAt");
};

const setAccountUrlSection = (sectionId) => {
    const cleanUrl = `${location.pathname}${location.search}`;

    if (sectionId === "perfil") {
        history.replaceState(null, "", cleanUrl);
        return;
    }

    history.replaceState(null, "", `${cleanUrl}#${sectionId}`);
};

const showAccountSection = (sectionId) => {
    const normalizedSection = normalizeAccountSection(sectionId);
    const targetSection = document.querySelector(`[data-account-section="${normalizedSection}"]`);

    if (!targetSection) {
        return;
    }

    accountSections.forEach((section) => {
        section.hidden = section !== targetSection;
    });

    accountNavLinks.forEach((link) => {
        link.classList.toggle("is-active", link.dataset.accountTab === normalizedSection);
    });

    if (normalizedSection === "compras") {
        loadPurchases();
    }
};

const normalizeAccountSection = (sectionId) => {
    if (sectionId === "historial") {
        return "compras";
    }

    return sectionId || "perfil";
};

const setStatus = (message, type = "error") => {
    if (!profileStatus) {
        return;
    }

    profileStatus.textContent = message;
    profileStatus.dataset.type = type;
};

const setPasswordStatus = (message, type = "error") => {
    if (!passwordStatus) {
        return;
    }

    passwordStatus.textContent = message;
    passwordStatus.dataset.type = type;
};

const setLoading = (isLoading) => {
    if (!profileSubmit) {
        return;
    }

    profileSubmit.disabled = isLoading || !hasProfileChanged();
    profileSubmit.textContent = isLoading ? "Guardando..." : "Guardar cambios";
};

const getPasswordValues = () => {
    return {
        currentPassword: currentPasswordInput?.value || "",
        newPassword: newPasswordInput?.value || "",
        confirmPassword: confirmPasswordInput?.value || ""
    };
};

const hasPasswordInput = () => {
    const values = getPasswordValues();
    return Object.values(values).some((value) => value.trim().length > 0);
};

const updatePasswordState = () => {
    const hasInput = hasPasswordInput();

    if (passwordSubmit) {
        passwordSubmit.disabled = !hasInput;
    }

    if (passwordCancel) {
        passwordCancel.hidden = !hasInput;
    }
};

const setPasswordLoading = (isLoading) => {
    if (!passwordSubmit) {
        return;
    }

    passwordSubmit.disabled = isLoading || !hasPasswordInput();
    passwordSubmit.textContent = isLoading ? "Actualizando..." : "Actualizar Contrase\u00f1a";
};

const resetPasswordForm = () => {
    passwordInputs.forEach((input) => {
        input.value = "";
        input.type = "password";
    });

    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
        button.setAttribute("aria-label", "Mostrar contrase\u00f1a");
    });

    setPasswordStatus("");
    updatePasswordState();
};

const getCurrentProfileValues = () => {
    return {
        nombre: (nameInput?.value || "").trim().replace(/\s+/g, " "),
        email: (emailInput?.value || "").trim().toLowerCase(),
        celular: (phoneInput?.value || "").replace(/\s+/g, "")
    };
};

const hasProfileChanged = () => {
    if (!originalProfile) {
        return false;
    }

    const current = getCurrentProfileValues();

    return (
        current.nombre !== String(originalProfile.nombre || "").trim().replace(/\s+/g, " ") ||
        current.email !== String(originalProfile.email || "").trim().toLowerCase() ||
        current.celular !== String(originalProfile.celular || "").replace(/\s+/g, "")
    );
};

const updateFormState = () => {
    const hasChanges = hasProfileChanged();

    if (profileSubmit) {
        profileSubmit.disabled = !hasChanges;
    }

    if (profileCancel) {
        profileCancel.hidden = !hasChanges;
    }
};

const showSuccessModal = ({ title = "Cambios guardados", message = "Sus cambios se guardaron correctamente.", onClose = null } = {}) => {
    if (!successModal) {
        return;
    }

    if (successTitle) {
        successTitle.textContent = title;
    }

    if (successMessage) {
        successMessage.textContent = message;
    }

    successAction = onClose;
    successModal.removeAttribute("hidden");
    successClose?.focus();
};

const closeSuccessModal = ({ runAction = false } = {}) => {
    successModal?.setAttribute("hidden", "");

    if (runAction && successAction) {
        const action = successAction;
        successAction = null;
        action();
        return;
    }

    if (!runAction) {
        successAction = null;
    }
};

const fillProfile = (profile) => {
    originalProfile = { ...profile };

    if (nameInput) {
        nameInput.value = profile.nombre || "";
    }

    if (emailInput) {
        emailInput.value = profile.email || "";
    }

    if (dniInput) {
        dniInput.value = profile.dni || "";
    }

    if (phoneInput) {
        phoneInput.value = profile.celular || "";
    }

    if (profileNameTitle) {
        profileNameTitle.textContent = profile.nombre || "Tu perfil";
    }

    if (profileMessage) {
        profileMessage.textContent = `Hola ${profile.nombre || "cliente"}, actualiza tus datos para que tus pedidos salgan sin problemas.`;
    }

    updateFormState();
};

const normalizePurchaseStatus = (status = "") => {
    const cleanStatus = String(status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (/entreg|list|final|complet/.test(cleanStatus)) {
        return "Completo";
    }

    if (/rechaz|cancel|anulad/.test(cleanStatus)) {
        return "Cancelado";
    }

    if (/acept|prepar|proceso|curso/.test(cleanStatus)) {
        return "Proceso";
    }

    if (/pend|registr/.test(cleanStatus)) {
        return "Pendiente";
    }

    return status || "Pendiente";
};

const formatPurchaseCode = (code) => {
    const cleanCode = String(code || "").trim();

    if (!cleanCode) {
        return "#CHV";
    }

    return cleanCode.startsWith("#") ? cleanCode : `#${cleanCode}`;
};

const getTrackingUrl = (code) => {
    const cleanCode = String(code || "").trim().replace(/^#/, "");
    const params = new URLSearchParams();

    if (cleanCode) {
        params.set("pedido", cleanCode);
    }

    return `/assets/pages/contact/contact.html${params.toString() ? `?${params.toString()}` : ""}#seguimiento`;
};

const formatPurchaseDate = (value) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
};

const formatPurchaseTotal = (value) => {
    const amount = Number(value);

    if (!Number.isNaN(amount) && value !== "") {
        return `S/ ${amount.toFixed(2)}`;
    }

    return value ? String(value) : "-";
};

const escapeHtml = (value) => {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const setPurchasesState = ({ loading = false, hasRows = false } = {}) => {
    if (purchasesLoading) {
        purchasesLoading.hidden = !loading;
    }

    if (purchasesTable) {
        purchasesTable.hidden = loading || !hasRows;
    }

    if (purchasesEmpty) {
        purchasesEmpty.hidden = loading || hasRows;
    }
};

const renderPurchases = (purchases = []) => {
    if (!purchasesBody) {
        return;
    }

    purchasesBody.innerHTML = purchases.map((purchase) => {
        const status = normalizePurchaseStatus(purchase.estado);
        const statusClass = status === "Completo" ? "is-complete" : status === "Proceso" ? "is-process" : status === "Cancelado" ? "is-canceled" : "is-pending";
        const reason = purchase.motivo_rechazo ? `<small class="purchase-reason">Motivo: ${escapeHtml(purchase.motivo_rechazo)}</small>` : "";
        const trackingUrl = getTrackingUrl(purchase.id);

        return `
            <tr data-purchase-link="${escapeHtml(trackingUrl)}">
                <td><a class="purchase-code" href="${escapeHtml(trackingUrl)}" aria-label="Ver seguimiento del pedido ${escapeHtml(formatPurchaseCode(purchase.id))}">${escapeHtml(formatPurchaseCode(purchase.id))}</a></td>
                <td>${escapeHtml(formatPurchaseDate(purchase.fecha))}</td>
                <td>${escapeHtml(purchase.productos || "Pedido registrado")}${reason}</td>
                <td><span class="purchase-status ${statusClass}">${escapeHtml(status)}</span></td>
                <td><strong>${escapeHtml(formatPurchaseTotal(purchase.total))}</strong></td>
            </tr>
        `;
    }).join("");

    setPurchasesState({ hasRows: purchases.length > 0 });
};

const loadPurchases = async () => {
    if (purchasesLoaded) {
        return;
    }

    const user = getAccountStoredUser();

    if (!user) {
        return;
    }

    purchasesLoaded = true;
    setPurchasesState({ loading: true });

    const params = new URLSearchParams();

    if (user.id) {
        params.set("id", user.id);
    }

    if (user.email) {
        params.set("email", user.email);
    }

    try {
        const response = await fetch(`${purchasesApiUrl}?${params.toString()}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudieron cargar tus compras.");
        }

        renderPurchases(Array.isArray(payload.compras) ? payload.compras : []);
    } catch (error) {
        purchasesLoaded = false;
        if (purchasesEmpty) {
            purchasesEmpty.querySelector("h2").textContent = "No se pudieron cargar tus compras";
            purchasesEmpty.querySelector("p").textContent = error.message || "Intentalo nuevamente en unos minutos.";
        }
        setPurchasesState({ hasRows: false });
    }
};

purchasesBody?.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) {
        return;
    }

    const row = event.target.closest("[data-purchase-link]");

    if (row?.dataset.purchaseLink) {
        window.location.href = row.dataset.purchaseLink;
    }
});

const validateProfile = ({ nombre, email, celular }) => {
    const cleanName = nombre.trim().replace(/\s+/g, " ");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = celular.replace(/\s+/g, "");
    const namePattern = /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]+(?:\s+[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]+)*$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^9\d{8}$/;

    if (!cleanName || !cleanEmail || !cleanPhone) {
        return { message: "Completa todos los campos antes de guardar." };
    }

    if (!namePattern.test(cleanName)) {
        return { message: "El nombre solo puede tener letras y espacios." };
    }

    if (!emailPattern.test(cleanEmail)) {
        return { message: "Ingresa un correo electronico valido." };
    }

    if (!phonePattern.test(cleanPhone)) {
        return { message: "Ingresa un celular peruano valido de 9 digitos que empiece con 9." };
    }

    return {
        data: {
            nombre: cleanName,
            email: cleanEmail,
            celular: cleanPhone
        }
    };
};

const validatePassword = ({ currentPassword, newPassword, confirmPassword }) => {
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !next || !confirm) {
        return { message: "Completa todos los campos antes de actualizar tu contrase\u00f1a." };
    }

    if (next.length < 8) {
        return { message: "La nueva contrase\u00f1a debe tener minimo 8 caracteres." };
    }

    if (next !== confirm) {
        return { message: "Las contrase\u00f1as nuevas no coinciden." };
    }

    if (current === next) {
        return { message: "La nueva contrase\u00f1a debe ser diferente a la actual." };
    }

    return {
        data: {
            currentPassword: current,
            newPassword: next,
            confirmPassword: confirm
        }
    };
};

const loadProfile = async () => {
    const user = getAccountStoredUser();

    if (!user) {
        window.location.href = "/assets/pages/login/";
        return;
    }

    const params = new URLSearchParams();

    if (user.id) {
        params.set("id", user.id);
    } else {
        params.set("email", user.email || "");
    }

    try {
        const response = await fetch(`${profileApiUrl}?${params.toString()}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudo cargar tu perfil.");
        }

        fillProfile(payload.user);
        updateStoredUser(payload.user);
        setStatus("");
    } catch (error) {
        setStatus(error.message || "No se pudo cargar tu perfil.");
    }
};

accountNavLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        const section = normalizeAccountSection(link.dataset.accountTab);
        showAccountSection(section);
        setAccountUrlSection(section);
    });
});

window.addEventListener("hashchange", () => {
    const nextSection = normalizeAccountSection(location.hash ? location.hash.slice(1) : "perfil");
    showAccountSection(nextSection);
});

window.addEventListener("chavala:account-section", (event) => {
    const nextSection = normalizeAccountSection(event.detail?.section);
    showAccountSection(nextSection);
    setAccountUrlSection(nextSection);
});

document.addEventListener("click", (event) => {
    const ordersOption = event.target.closest('[data-auth-option="orders"]');

    if (!ordersOption) {
        return;
    }

    showAccountSection("compras");
    setAccountUrlSection("compras");
});

phoneInput?.addEventListener("input", () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 9);
    updateFormState();
});

[nameInput, emailInput].forEach((input) => {
    input?.addEventListener("input", updateFormState);
});

profileCancel?.addEventListener("click", () => {
    if (originalProfile) {
        fillProfile(originalProfile);
        setStatus("");
    }
});

passwordInputs.forEach((input) => {
    input.addEventListener("input", () => {
        setPasswordStatus("");
        updatePasswordState();
    });
});

document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
        const inputId = button.getAttribute("aria-controls");
        const input = inputId ? document.getElementById(inputId) : null;

        if (!input) {
            return;
        }

        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";
        button.setAttribute("aria-label", isVisible ? "Mostrar contrase\u00f1a" : "Ocultar contrase\u00f1a");
        input.focus();
    });
});

passwordCancel?.addEventListener("click", resetPasswordForm);

profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = getAccountStoredUser();

    if (!user || !originalProfile) {
        setStatus("Inicia sesion nuevamente para actualizar tu perfil.");
        return;
    }

    const validation = validateProfile({
        nombre: nameInput?.value || "",
        email: emailInput?.value || "",
        celular: phoneInput?.value || ""
    });

    if (validation.message) {
        setStatus(validation.message);
        return;
    }

    setLoading(true);
    setStatus("");

    try {
        const response = await fetch(profileApiUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: user.id || originalProfile.id,
                currentEmail: originalProfile.email,
                ...validation.data
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudo guardar el perfil.");
        }

        fillProfile(payload.user);
        updateStoredUser(payload.user);
        setStatus("");
        showSuccessModal();
    } catch (error) {
        setStatus(error.message || "No se pudo guardar el perfil.");
    } finally {
        setLoading(false);
        updateFormState();
    }
});

passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = getAccountStoredUser();

    if (!user || !originalProfile) {
        setPasswordStatus("Inicia sesion nuevamente para cambiar tu contrase\u00f1a.");
        return;
    }

    const validation = validatePassword(getPasswordValues());

    if (validation.message) {
        setPasswordStatus(validation.message);
        return;
    }

    setPasswordLoading(true);
    setPasswordStatus("");

    try {
        const response = await fetch(passwordApiUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: user.id || originalProfile.id,
                currentEmail: originalProfile.email,
                ...validation.data
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudo actualizar la contrase\u00f1a.");
        }

        resetPasswordForm();
        showSuccessModal({
            title: "Contrase\u00f1a actualizada",
            message: "Su contrase\u00f1a se cambi\u00f3 correctamente.",
            onClose: () => {
                clearStoredUser();
                window.location.href = "/assets/pages/login/";
            }
        });
    } catch (error) {
        setPasswordStatus(error.message || "No se pudo actualizar la contrase\u00f1a.");
    } finally {
        setPasswordLoading(false);
        updatePasswordState();
    }
});

successClose?.addEventListener("click", () => closeSuccessModal({ runAction: true }));

successModal?.addEventListener("click", (event) => {
    if (event.target === successModal && !successAction) {
        closeSuccessModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !successModal?.hasAttribute("hidden") && !successAction) {
        closeSuccessModal();
    }
});

const initialSection = normalizeAccountSection(location.hash ? location.hash.slice(1) : "perfil");
showAccountSection(initialSection);
setAccountUrlSection(initialSection);
updatePasswordState();
loadProfile();
