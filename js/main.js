const includePartials = async () => {
    const placeholders = document.querySelectorAll("[data-include]");

    await Promise.all([...placeholders].map(async (placeholder) => {
        const partialPath = placeholder.dataset.include;

        try {
            const partialUrl = `${partialPath}${partialPath.includes("?") ? "&" : "?"}v=20260629-2`;
            const response = await fetch(partialUrl, { cache: "no-store" });

            if (!response.ok) {
                throw new Error(`No se pudo cargar ${partialPath}`);
            }

            const html = await response.text();
            placeholder.outerHTML = html.trim();
        } catch (error) {
            console.error(error);
        }
    }));
};

const sessionMaxIdleMs = 30 * 60 * 1000;
const sessionTimestampKeys = ["chavalaLastActivity", "chavalaExpiresAt"];

const getStoredUserRaw = () => {
    return localStorage.getItem("chavalaUser") || sessionStorage.getItem("chavalaUser");
};

const clearStoredSession = () => {
    localStorage.removeItem("chavalaUser");
    sessionStorage.removeItem("chavalaUser");
    sessionTimestampKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
};

const getSessionStorageTarget = () => {
    return localStorage.getItem("chavalaUser") ? localStorage : sessionStorage;
};

const isSessionExpired = () => {
    const expiresAt = Number(localStorage.getItem("chavalaExpiresAt") || sessionStorage.getItem("chavalaExpiresAt") || 0);

    return expiresAt > 0 && Date.now() > expiresAt;
};

const touchSession = () => {
    if (!getStoredUserRaw()) {
        return;
    }

    if (isSessionExpired()) {
        handleSessionExpiration();
        return;
    }

    const targetStorage = getSessionStorageTarget();
    const now = Date.now();
    targetStorage.setItem("chavalaLastActivity", String(now));
    targetStorage.setItem("chavalaExpiresAt", String(now + sessionMaxIdleMs));
};

const getStoredUser = () => {
    const storedUser = getStoredUserRaw();

    if (!storedUser) {
        return null;
    }

    if (isSessionExpired()) {
        clearStoredSession();
        return null;
    }

    try {
        const user = JSON.parse(storedUser);
        const targetStorage = getSessionStorageTarget();

        if (!targetStorage.getItem("chavalaExpiresAt")) {
            touchSession();
        }

        return user;
    } catch (error) {
        clearStoredSession();
        return null;
    }
};

const getDisplayName = (user) => {
    const name = user?.nombre || user?.name || user?.email || "";
    const cleanName = String(name).trim();

    if (!cleanName) {
        return "Mi cuenta";
    }

    return cleanName.includes("@") ? cleanName.split("@")[0] : cleanName;
};

const getAccountLink = (user) => {
    const role = String(user?.rol || user?.rango || "").toLowerCase().trim();

    if (role === "usuario" || role === "cliente") {
        return "/assets/pages/account/account.html";
    }

    return "/index.html";
};

const updateAuthHeader = () => {
    const authMenu = document.querySelector("[data-auth-menu]");
    const authLink = document.querySelector("[data-auth-link]");
    const authLabel = document.querySelector("[data-auth-label]");
    const authDropdown = document.querySelector("[data-auth-dropdown]");
    const user = getStoredUser();

    if (!authLink || !authLabel) {
        return;
    }

    if (!user) {
        authMenu?.classList.remove("is-authenticated", "is-open");
        authLink.classList.remove("is-authenticated");
        authLink.href = "/assets/pages/login/";
        authLabel.textContent = "Login";
        authLink.removeAttribute("title");
        authLink.setAttribute("aria-expanded", "false");
        authDropdown?.setAttribute("hidden", "");
        return;
    }

    const displayName = getDisplayName(user);

    authMenu?.classList.add("is-authenticated");
    authLink.classList.add("is-authenticated");
    authLink.href = "#";
    authLink.title = `Sesion iniciada como ${displayName}`;
    authLink.setAttribute("aria-haspopup", "true");
    authLink.setAttribute("aria-expanded", "false");
    authLabel.textContent = displayName;
    authDropdown?.setAttribute("hidden", "");
};

const closeAuthMenu = () => {
    const authMenu = document.querySelector("[data-auth-menu]");
    const authLink = document.querySelector("[data-auth-link]");
    const authDropdown = document.querySelector("[data-auth-dropdown]");

    authMenu?.classList.remove("is-open");
    authLink?.setAttribute("aria-expanded", "false");
    authDropdown?.setAttribute("hidden", "");
};

const openAuthMenu = () => {
    const authMenu = document.querySelector("[data-auth-menu]");
    const authLink = document.querySelector("[data-auth-link]");
    const authDropdown = document.querySelector("[data-auth-dropdown]");

    if (!authMenu || !authLink || !authDropdown) {
        return;
    }

    authMenu.classList.add("is-open");
    authLink.setAttribute("aria-expanded", "true");
    authDropdown.removeAttribute("hidden");
};

const toggleAuthMenu = () => {
    const authMenu = document.querySelector("[data-auth-menu]");
    const authLink = document.querySelector("[data-auth-link]");
    const authDropdown = document.querySelector("[data-auth-dropdown]");

    if (!authMenu || !authLink || !authDropdown) {
        return;
    }

    const shouldOpen = !authMenu.classList.contains("is-open");

    if (shouldOpen) {
        openAuthMenu();
    } else {
        closeAuthMenu();
    }
};

const logoutUser = () => {
    clearStoredSession();
    closeAuthMenu();
    window.location.href = "/index.html";
};

const handleSessionExpiration = () => {
    if (!getStoredUserRaw() || !isSessionExpired()) {
        return;
    }

    clearStoredSession();
    closeAuthMenu();
    updateAuthHeader();

    const protectedPaths = [
        "/assets/pages/account/",
        "/assets/pages/account/account.html",
        "/assets/pages/catalog/",
        "/assets/pages/catalog/catalog.html"
    ];
    const isProtected = protectedPaths.some((path) => location.pathname.includes(path));

    if (isProtected) {
        window.location.href = "/assets/pages/login/";
    }
};

const setupSessionActivity = () => {
    ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
        document.addEventListener(eventName, touchSession, { passive: true });
    });

    window.setInterval(() => {
        handleSessionExpiration();
    }, 30000);

    window.addEventListener("storage", (event) => {
        if (event.key === "chavalaUser" || sessionTimestampKeys.includes(event.key || "")) {
            updateAuthHeader();
            handleSessionExpiration();
        }
    });
};

const scrollToTarget = (targetId) => {
    const target = document.getElementById(targetId);

    if (!target) {
        return false;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
};

const handlePendingScroll = () => {
    const targetId = sessionStorage.getItem("chavalaScrollTarget");

    if (!targetId) {
        return;
    }

    if (scrollToTarget(targetId)) {
        sessionStorage.removeItem("chavalaScrollTarget");
    }
};

includePartials().then(() => {
    updateAuthHeader();
    handlePendingScroll();
    setupSessionActivity();
});

const locationButtons = document.querySelectorAll(".visit__location-button[data-map-src]");
const locationMap = document.querySelector(".visit__map iframe");
const scrollButtons = document.querySelectorAll("[data-scroll-target]");
const wspFab = document.getElementById("wspFab");
const wspChat = document.getElementById("wspChat");
const wspClose = document.getElementById("wspClose");
const wspMessages = document.getElementById("wspMessages");
const wspInput = document.getElementById("wspInput");
const wspSend = document.getElementById("wspSend");
const wspBadge = document.getElementById("wspBadge");
const wspChips = document.querySelectorAll(".wsp-chip");

if (location.hash === "#nosotros") {
    history.replaceState(null, "", location.pathname + location.search);
}

scrollButtons.forEach((button) => {
    button.addEventListener("click", () => {
        scrollToTarget(button.dataset.scrollTarget);
    });
});

document.addEventListener("click", (event) => {
    const authLink = event.target.closest("[data-auth-link]");
    const authMenu = event.target.closest("[data-auth-menu]");
    const logoutButton = event.target.closest("[data-logout]");
    const authOption = event.target.closest("[data-auth-option]");

    if (logoutButton) {
        event.preventDefault();
        logoutUser();
        return;
    }

    if (authOption) {
        event.preventDefault();
        if (authOption.dataset.authOption === "account") {
            window.location.href = getAccountLink(getStoredUser());
            return;
        }
        if (authOption.dataset.authOption === "orders") {
            window.location.href = "/assets/pages/account/account.html#compras";
            return;
        }
        closeAuthMenu();
        return;
    }

    if (authLink && getStoredUser()) {
        event.preventDefault();
        event.stopPropagation();
        toggleAuthMenu();
        return;
    }

    if (!authMenu) {
        closeAuthMenu();
    }

    const link = event.target.closest("[data-home-scroll-target]");

    if (!link) {
        return;
    }

    const targetId = link.dataset.homeScrollTarget;

    if (!targetId) {
        return;
    }

    const isHomePage = location.pathname.endsWith("/index.html") || location.pathname === "/";

    if (isHomePage && scrollToTarget(targetId)) {
        event.preventDefault();
        return;
    }

    sessionStorage.setItem("chavalaScrollTarget", targetId);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeAuthMenu();
        if (wspChat?.classList.contains("is-open")) {
            closeWspChat();
        }
    }
});

if (locationButtons.length && locationMap) {
    locationButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const mapSrc = button.dataset.mapSrc;
            const mapTitle = button.dataset.mapTitle;

            if (!mapSrc) {
                return;
            }

            locationMap.src = mapSrc;

            if (mapTitle) {
                locationMap.title = mapTitle;
            }

            locationButtons.forEach((item) => {
                item.classList.remove("is-active");
                item.removeAttribute("aria-current");
                item.closest("li")?.classList.remove("is-active");
            });

            button.classList.add("is-active");
            button.setAttribute("aria-current", "location");
            button.closest("li")?.classList.add("is-active");
        });
    });
}

const wspKnowledge = [
    {
        keys: ["producto", "tienen", "venden", "carta", "menu", "ofrecen", "catalogo", "que hay"],
        reply: "Tenemos pasteles personalizados, bocaditos, postres, pan artesanal, comida rapida y almuerzos. Puedes revisar el catalogo completo desde el menu superior."
    },
    {
        keys: ["horario", "hora", "abierto", "cierra", "abren", "atienden", "cuando"],
        reply: "Atendemos de lunes a viernes de 8 a.m. a 11 p.m. Sabados y domingos de 8 a.m. a 12 p.m."
    },
    {
        keys: ["ubicacion", "ubica", "donde", "local", "direccion", "tienda", "sucursal", "lugar"],
        reply: "Nos encuentras en Av. Canada 1733, Av. Aviacion 2327, Av. San Juan 517, Calle Diego Fernandez 208, Av. Los Quechuas 1221 y Av. Hermes 208."
    },
    {
        keys: ["pedido", "pedir", "comprar", "encargar", "reservar", "orden", "como"],
        reply: "Puedes hacer tu pedido por WhatsApp al 934 344 116 o visitarnos en cualquiera de nuestros locales. Para pasteles personalizados, coordina con anticipacion."
    },
    {
        keys: ["pastel", "torta", "personalizado", "personalizada", "cumpleanos", "aniversario", "diseno", "especial"],
        reply: "Hacemos pasteles personalizados con tematica, sabor, tamano y decoracion a pedido. Cuentanos tu idea en la seccion Personalizados o por WhatsApp."
    },
    {
        keys: ["precio", "cuesta", "costo", "cuanto", "valor", "soles"],
        reply: "Los precios varian segun producto, tamano y decoracion. Para una cotizacion exacta escribenos al WhatsApp 934 344 116."
    },
    {
        keys: ["bocadito", "bocaditos", "mesa dulce", "dulce", "postre", "evento"],
        reply: "Tenemos bocaditos y postres para reuniones, mesas dulces y eventos. Indicanos la cantidad de personas para ayudarte mejor."
    },
    {
        keys: ["whatsapp", "wsp", "contacto", "telefono", "llamar", "numero"],
        reply: "Puedes contactarnos al WhatsApp 934 344 116 o al correo pedidos.chavalapasteleria@gmail.com."
    },
    {
        keys: ["delivery", "envio", "despacho", "llevan", "traen", "domicilio"],
        reply: "Para consultar delivery y cobertura, escribenos por WhatsApp al 934 344 116 indicando tu distrito."
    },
    {
        keys: ["instagram", "tiktok", "facebook", "redes", "social", "seguir"],
        reply: "Puedes seguirnos en nuestras redes sociales desde los iconos del footer."
    },
    {
        keys: ["hola", "buenos", "buenas", "hey", "saludos", "buen dia"],
        reply: "Hola, bienvenido a Chavala Panaderia y Pasteleria. Dime en que puedo ayudarte hoy."
    },
    {
        keys: ["gracias", "perfecto", "excelente", "genial", "listo"],
        reply: "Con mucho gusto. Si necesitas algo mas, aqui estamos para ayudarte."
    }
];
const wspDefaultReply = "No estoy seguro sobre eso. Para una respuesta precisa, puedes hablar con un asesor por WhatsApp al 934 344 116.";
let wspIsOpen = false;
let wspIsBotBusy = false;

const getWspTime = () => {
    return new Intl.DateTimeFormat("es-PE", {
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date());
};

const normalizeWspText = (value) => {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

const findWspReply = (text) => {
    const normalizedText = normalizeWspText(text);
    const match = wspKnowledge.find((item) => {
        return item.keys.some((key) => normalizedText.includes(normalizeWspText(key)));
    });

    return match?.reply || wspDefaultReply;
};

const addWspBubble = (text, who = "bot") => {
    if (!wspMessages) {
        return;
    }

    const bubble = document.createElement("div");
    const message = document.createElement("p");
    const time = document.createElement("span");

    bubble.className = `wsp-bubble wsp-bubble--${who}`;
    message.textContent = text;
    time.className = "wsp-bubble__time";
    time.textContent = getWspTime();
    bubble.append(message, time);
    wspMessages.appendChild(bubble);
    wspMessages.scrollTop = wspMessages.scrollHeight;
};

const showWspTyping = () => {
    if (!wspMessages) {
        return;
    }

    const typing = document.createElement("div");
    typing.className = "wsp-typing";
    typing.id = "wspTyping";
    typing.innerHTML = "<span></span><span></span><span></span>";
    wspMessages.appendChild(typing);
    wspMessages.scrollTop = wspMessages.scrollHeight;
};

const removeWspTyping = () => {
    document.getElementById("wspTyping")?.remove();
};

const replyWspBot = (userText) => {
    if (wspIsBotBusy) {
        return;
    }

    wspIsBotBusy = true;
    if (wspSend) {
        wspSend.disabled = true;
    }
    showWspTyping();

    window.setTimeout(() => {
        removeWspTyping();
        addWspBubble(findWspReply(userText), "bot");
        wspIsBotBusy = false;
        if (wspSend) {
            wspSend.disabled = false;
        }
        wspInput?.focus();
    }, 700);
};

const openWspChat = () => {
    if (!wspChat || !wspFab) {
        return;
    }

    wspIsOpen = true;
    wspChat.classList.add("is-open");
    wspFab.setAttribute("aria-expanded", "true");
    wspBadge?.classList.add("is-hidden");
    wspInput?.focus();

    if (wspMessages && wspMessages.children.length === 0) {
        showWspTyping();
        window.setTimeout(() => {
            removeWspTyping();
            addWspBubble("Hola, soy el asistente de Chavala Panaderia. En que puedo ayudarte hoy?", "bot");
        }, 650);
    }
};

function closeWspChat() {
    if (!wspChat || !wspFab) {
        return;
    }

    wspIsOpen = false;
    wspChat.classList.remove("is-open");
    wspFab.setAttribute("aria-expanded", "false");
}

const sendWspMessage = () => {
    const text = String(wspInput?.value || "").trim();

    if (!text || wspIsBotBusy) {
        return;
    }

    addWspBubble(text, "user");
    if (wspInput) {
        wspInput.value = "";
        wspInput.style.height = "auto";
    }
    replyWspBot(text);
};

wspFab?.addEventListener("click", () => {
    if (wspIsOpen) {
        closeWspChat();
    } else {
        openWspChat();
    }
});

wspClose?.addEventListener("click", closeWspChat);
wspSend?.addEventListener("click", sendWspMessage);

wspInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendWspMessage();
    }
});

wspInput?.addEventListener("input", () => {
    wspInput.style.height = "auto";
    wspInput.style.height = `${Math.min(wspInput.scrollHeight, 90)}px`;
});

wspChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        const text = chip.dataset.msg;

        if (!text || wspIsBotBusy) {
            return;
        }

        openWspChat();
        addWspBubble(text, "user");
        replyWspBot(text);
    });
});
