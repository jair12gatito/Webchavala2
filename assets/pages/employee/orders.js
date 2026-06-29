const employeeProfileApiUrl = "http://localhost:3000/api/usuarios/perfil";
const employeeOrdersApiUrl = "http://localhost:3000/api/empleados/pedidos";
const employeeOrderUpdateApiUrl = "http://localhost:3000/api/empleados/pedidos";
const employeeNameLabel = document.querySelector("[data-employee-name]");
const employeeLogout = document.querySelector("[data-employee-logout]");
const employeeTitle = document.querySelector("[data-employee-title]");
const employeeTabs = document.querySelectorAll("[data-employee-tab]");
const employeeSections = document.querySelectorAll("[data-employee-section]");
const historyList = document.querySelector("[data-history-list]");
const historyEmpty = document.querySelector("[data-history-empty]");
const historyCount = document.querySelector("[data-history-count]");
const historySearch = document.querySelector("[data-history-search]");
const historyMore = document.querySelector("[data-history-more]");
const pendingOrdersList = document.querySelector("[data-pending-orders]");
const progressOrdersList = document.querySelector("[data-progress-orders]");
const pendingOrdersEmpty = document.querySelector("[data-pending-empty]");
const progressOrdersEmpty = document.querySelector("[data-progress-empty]");
const countPending = document.querySelector("[data-count-pending]");
const countProgress = document.querySelector("[data-count-progress]");
const countReady = document.querySelector("[data-count-ready]");
const profileForm = document.querySelector("[data-employee-profile-form]");
const profileStatus = document.querySelector("[data-profile-status]");
const profileCancel = document.querySelector("[data-profile-cancel]");
const profileTitle = document.querySelector("[data-profile-title]");
const profileCopy = document.querySelector("[data-profile-copy]");
const profileNameInput = document.querySelector("#employee-profile-name");
const profileDniInput = document.querySelector("#employee-profile-dni");
const profileRoleInput = document.querySelector("#employee-profile-role");
const profileEmailInput = document.querySelector("#employee-profile-email");
const profilePhoneInput = document.querySelector("#employee-profile-phone");
const profileSubmit = profileForm?.querySelector(".employee-save");
const employeeModal = document.querySelector("[data-employee-modal]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalMessage = document.querySelector("[data-modal-message]");
const modalIcon = document.querySelector("[data-modal-icon]");
const modalCloseButtons = document.querySelectorAll("[data-modal-close]");
const rejectModal = document.querySelector("[data-reject-modal]");
const rejectReasonInput = document.querySelector("[data-reject-reason]");
const rejectStatus = document.querySelector("[data-reject-status]");
const rejectCancelButtons = document.querySelectorAll("[data-reject-cancel]");
const rejectConfirmButton = document.querySelector("[data-reject-confirm]");

let currentEmployee = null;
let originalProfile = null;
let pedidosCache = [];
let rejectOrderId = "";
let historyVisibleCount = 4;
const historyPageSize = 4;
const employeeOrdersRefreshMs = 4000;
let employeeOrdersTimer = null;
let employeeOrdersLoading = false;

const sectionTitles = {
    ordenes: "\u00d3rdenes del D\u00eda",
    historial: "Historial de Pedidos del Día",
    perfil: "Mi Perfil"
};

const getEmployeeUser = () => {
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

const updateStoredEmployee = (employee) => {
    const targetStorage = localStorage.getItem("chavalaUser") ? localStorage : sessionStorage;
    targetStorage.setItem("chavalaUser", JSON.stringify(employee));
};

const getEmployeeDisplayName = (employee) => {
    const name = String(employee?.nombre || employee?.name || employee?.email || "").trim();

    if (!name) {
        return "Empleado";
    }

    return name.includes("@") ? name.split("@")[0] : name;
};

const setEmployeeName = (employee) => {
    if (employeeNameLabel) {
        employeeNameLabel.textContent = getEmployeeDisplayName(employee);
    }
};

const logoutEmployee = () => {
    localStorage.removeItem("chavalaUser");
    sessionStorage.removeItem("chavalaUser");
    localStorage.removeItem("chavalaLastActivity");
    sessionStorage.removeItem("chavalaLastActivity");
    localStorage.removeItem("chavalaExpiresAt");
    sessionStorage.removeItem("chavalaExpiresAt");
    window.location.href = "/assets/pages/login/";
};

const setProfileStatus = (message, type = "error") => {
    if (!profileStatus) {
        return;
    }

    profileStatus.textContent = message;
    profileStatus.dataset.type = type;
};

const showEmployeeModal = ({ title, message, type = "success" }) => {
    if (!employeeModal || !modalTitle || !modalMessage) {
        window.alert(message);
        return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    employeeModal.dataset.type = type;

    if (modalIcon) {
        modalIcon.innerHTML = type === "success"
            ? '<svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"></path></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path></svg>';
    }

    employeeModal.hidden = false;
    document.body.classList.add("employee-modal-open");
    employeeModal.querySelector(".employee-modal__button")?.focus();
};

const closeEmployeeModal = () => {
    if (!employeeModal) {
        return;
    }

    employeeModal.hidden = true;
    document.body.classList.remove("employee-modal-open");
};

const normalizeRole = (value) => String(value || "").toLowerCase().trim();

const escapeHtml = (value) => {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const showSection = (sectionId) => {
    const target = document.querySelector(`[data-employee-section="${sectionId}"]`);

    if (!target) {
        return;
    }

    employeeSections.forEach((section) => {
        section.hidden = section !== target;
    });

    employeeTabs.forEach((tab) => {
        const isActive = tab.dataset.employeeTab === sectionId;
        tab.classList.toggle("is-active", isActive);
        tab.toggleAttribute("aria-current", isActive);
    });

    if (employeeTitle) {
        employeeTitle.textContent = "Panel de Trabajador";
    }

    history.replaceState(null, "", `${location.pathname}${location.search}`);
};

const getCurrentProfileValues = () => ({
    nombre: (profileNameInput?.value || "").trim().replace(/\s+/g, " "),
    email: (profileEmailInput?.value || "").trim().toLowerCase(),
    celular: (profilePhoneInput?.value || "").replace(/\s+/g, "")
});

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

const updateProfileState = () => {
    const hasChanges = hasProfileChanged();

    if (profileSubmit) {
        profileSubmit.disabled = !hasChanges;
    }

    if (profileCancel) {
        profileCancel.hidden = !hasChanges;
    }
};

const setProfileLoading = (isLoading) => {
    if (!profileSubmit) {
        return;
    }

    profileSubmit.disabled = isLoading || !hasProfileChanged();
    profileSubmit.textContent = isLoading ? "Guardando..." : "Guardar cambios";
};

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

const fillProfile = (profile) => {
    originalProfile = { ...profile };
    currentEmployee = { ...(currentEmployee || {}), ...profile };

    if (profileNameInput) {
        profileNameInput.value = profile.nombre || "";
    }

    if (profileDniInput) {
        profileDniInput.value = profile.dni || "";
    }

    if (profileRoleInput) {
        profileRoleInput.value = profile.rol || profile.rango || "empleado";
    }

    if (profileEmailInput) {
        profileEmailInput.value = profile.email || "";
    }

    if (profilePhoneInput) {
        profilePhoneInput.value = profile.celular || "";
    }

    if (profileTitle) {
        profileTitle.textContent = profile.nombre || "Empleado";
    }

    if (profileCopy) {
        profileCopy.textContent = `Hola ${profile.nombre || "empleado"}, mant\u00e9n tus datos actualizados para coordinar mejor cada pedido.`;
    }

    setEmployeeName(currentEmployee);
    updateStoredEmployee(currentEmployee);
    updateProfileState();
};

const getProfileParams = (employee) => {
    const params = new URLSearchParams();

    if (employee?.id) {
        params.set("id", employee.id);
    } else if (employee?.email) {
        params.set("email", employee.email);
    }

    return params;
};

const loadEmployeeProfile = async (employee) => {
    const params = getProfileParams(employee);

    if (!params.toString()) {
        return;
    }

    try {
        const response = await fetch(`${employeeProfileApiUrl}?${params.toString()}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.user) {
            throw new Error(payload.message || "No se pudo cargar el perfil.");
        }

        const freshEmployee = {
            ...employee,
            ...payload.user
        };

        fillProfile(freshEmployee);
        setProfileStatus("");
    } catch (error) {
        setProfileStatus(error.message || "No se pudo cargar el perfil.");
    }
};

const getPedidoStatus = (pedido) => {
    if (pedido.motivo_rechazo === "__PEDIDO_COMPLETO__") {
        return "listo";
    }

    return String(pedido.estado || pedido.status || pedido.estado_pedido || "").toLowerCase().trim();
};

const getHistoryStatusInfo = (pedido) => {
    const status = getPedidoStatus(pedido);

    if (["lista", "listo", "listas", "ready", "completado", "finalizado"].includes(status)) {
        return { label: "Listo", className: "is-ready" };
    }

    if (["rechazado", "cancelado", "cancelada", "anulado", "anulada"].includes(status)) {
        return { label: "Cancelado", className: "is-canceled" };
    }

    if (["aceptado", "en preparacion", "en preparación", "preparacion", "preparación", "en curso", "proceso"].includes(status)) {
        return { label: "Preparación", className: "is-progress" };
    }

    return { label: "Pendiente", className: "is-pending" };
};

const isToday = (value) => {
    if (!value) {
        return false;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
};

const getPedidoDateValue = (pedido) => {
    return pedido.created_at || pedido.fecha || pedido.fecha_pedido || pedido.updated_at || "";
};

const getPedidoTotal = (pedido) => {
    const value = pedido.total ?? pedido.monto_total ?? pedido.precio_total ?? pedido.subtotal ?? 0;
    const number = Number(value);

    if (Number.isFinite(number) && number > 0) {
        return number;
    }

    const detalles = pedido.pedido_detalles || pedido.detalles || pedido.items;

    if (Array.isArray(detalles) && detalles.length) {
        return detalles.reduce((sum, detalle) => {
            const cantidad = Number(detalle.cantidad || detalle.qty || 1);
            const precio = Number(detalle.precio || detalle.producto?.precio || detalle.productos?.precio || 0);
            return sum + ((Number.isFinite(cantidad) ? cantidad : 1) * (Number.isFinite(precio) ? precio : 0));
        }, 0);
    }

    return 0;
};

const getPedidoId = (pedido) => {
    return pedido.codigo || pedido.numero || pedido.id || "Pedido";
};

const getPedidoClient = (pedido) => {
    return pedido.usuarios?.nombre || pedido.cliente_nombre || pedido.nombre_cliente || pedido.cliente || pedido.usuario_nombre || pedido.usuarios?.email || pedido.email || "Cliente";
};

const getPedidoDescription = (pedido) => {
    const detalles = pedido.pedido_detalles || pedido.detalles || pedido.items;

    if (Array.isArray(detalles) && detalles.length) {
        return detalles.map((detalle) => {
            const cantidad = detalle.cantidad || detalle.qty || 1;
            const producto = detalle.producto?.nombre || detalle.productos?.nombre || detalle.nombre_producto || detalle.producto_nombre || detalle.producto_id || "Producto";
            return `${cantidad}x ${producto}`;
        }).join(", ");
    }

    return pedido.descripcion || pedido.detalle || pedido.notas || pedido.observacion || "Pedido registrado";
};

const isPendingPedido = (pedido) => {
    const status = getPedidoStatus(pedido);
    return !status || ["pendiente", "pending", "nuevo", "nueva", "solicitado"].includes(status);
};

const isProgressPedido = (pedido) => {
    const status = getPedidoStatus(pedido);
    return ["aceptado", "en preparacion", "en preparaci\u00f3n", "preparacion", "preparaci\u00f3n", "en curso", "proceso"].includes(status);
};

const renderOrderCard = (pedido) => {
    const total = getPedidoTotal(pedido);
    const status = getPedidoStatus(pedido) || "pendiente";
    const id = String(pedido.id || getPedidoId(pedido));
    const isPending = isPendingPedido(pedido);
    const isProgress = isProgressPedido(pedido);
    const actions = isPending
        ? `
            <div class="employee-order-actions">
                <button class="employee-order-action employee-order-action--accept" type="button" data-order-action="aceptar" data-order-id="${escapeHtml(id)}">Aceptar</button>
                <button class="employee-order-action employee-order-action--reject" type="button" data-order-action="rechazar" data-order-id="${escapeHtml(id)}">Rechazar</button>
            </div>
        `
        : isProgress
            ? `
                <div class="employee-order-actions">
                    <button class="employee-order-action employee-order-action--finish" type="button" data-order-action="finalizar" data-order-id="${escapeHtml(id)}">Finalizar</button>
                </div>
            `
            : "";

    return `
        <article class="employee-order-card">
            <header>
                <div>
                    <span>#${escapeHtml(String(getPedidoId(pedido)).slice(0, 12))}</span>
                    <h3>${escapeHtml(getPedidoClient(pedido))}</h3>
                </div>
                <strong>S/ ${total.toFixed(2).replace(".00", "")}</strong>
            </header>
            <p>${escapeHtml(getPedidoDescription(pedido))}</p>
            <footer>
                <span>${escapeHtml(status)}</span>
                <small>${escapeHtml(formatDate(getPedidoDateValue(pedido)))}</small>
            </footer>
            ${actions}
        </article>
    `;
};

const refreshOrdersView = () => {
    updateOrderCounters(pedidosCache);
    renderTodayOrders(pedidosCache);
    renderHistory(pedidosCache);
};

const replacePedidoInCache = (pedido) => {
    const index = pedidosCache.findIndex((item) => item.id === pedido.id);

    if (index >= 0) {
        pedidosCache[index] = pedido;
    } else {
        pedidosCache.unshift(pedido);
    }
};

const updatePedidoStatus = async ({ id, accion, motivo = "" }) => {
    try {
        const response = await fetch(`${employeeOrderUpdateApiUrl}/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ accion, motivo })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.pedido) {
            throw new Error(payload.message || "No se pudo actualizar el pedido.");
        }

        replacePedidoInCache(payload.pedido);
        refreshOrdersView();

        showEmployeeModal({
            title: accion === "finalizar" ? "Pedido finalizado" : accion === "rechazar" ? "Pedido rechazado" : "Pedido aceptado",
            message: accion === "finalizar"
                ? "El cliente vera su pedido como completo."
                : accion === "rechazar"
                    ? "El cliente podra ver el motivo del rechazo."
                    : "El pedido paso a preparacion.",
            type: accion === "rechazar" ? "error" : "success"
        });
    } catch (error) {
        showEmployeeModal({
            title: "No se pudo actualizar",
            message: error.message || "No se pudo actualizar el pedido.",
            type: "error"
        });
    }
};

const openRejectModal = (id) => {
    rejectOrderId = id;

    if (rejectReasonInput) {
        rejectReasonInput.value = "";
    }

    if (rejectStatus) {
        rejectStatus.textContent = "";
    }

    if (rejectModal) {
        rejectModal.hidden = false;
        document.body.classList.add("employee-modal-open");
        rejectReasonInput?.focus();
    }
};

const closeRejectModal = () => {
    rejectOrderId = "";

    if (rejectModal) {
        rejectModal.hidden = true;
        document.body.classList.remove("employee-modal-open");
    }
};

const renderTodayOrders = (pedidos) => {
    if (!pendingOrdersList || !progressOrdersList || !pendingOrdersEmpty || !progressOrdersEmpty) {
        return;
    }

    const todayPedidos = pedidos.filter((pedido) => isToday(getPedidoDateValue(pedido)));
    const pendingOrders = todayPedidos.filter(isPendingPedido);
    const progressOrders = todayPedidos.filter(isProgressPedido);

    pendingOrdersList.innerHTML = pendingOrders.map(renderOrderCard).join("");
    progressOrdersList.innerHTML = progressOrders.map(renderOrderCard).join("");
    pendingOrdersEmpty.hidden = pendingOrders.length > 0;
    progressOrdersEmpty.hidden = progressOrders.length > 0;
};

const updateOrderCounters = (pedidos) => {
    const todayPedidos = pedidos.filter((pedido) => isToday(getPedidoDateValue(pedido)));
    const pendingStatuses = new Set(["pendiente", "pending", "nuevo", "nueva", "solicitado"]);
    const progressStatuses = new Set(["aceptado", "en preparacion", "en preparación", "preparacion", "preparación", "en curso", "proceso"]);
    const readyStatuses = new Set(["lista", "listo", "listas", "ready", "completado", "finalizado"]);

    const counters = todayPedidos.reduce((total, pedido) => {
        const status = getPedidoStatus(pedido);

        if (readyStatuses.has(status)) {
            total.ready += 1;
        } else if (progressStatuses.has(status)) {
            total.progress += 1;
        } else if (pendingStatuses.has(status) || !status) {
            total.pending += 1;
        }

        return total;
    }, { pending: 0, progress: 0, ready: 0 });

    if (countPending) {
        countPending.textContent = String(counters.pending);
    }

    if (countProgress) {
        countProgress.textContent = String(counters.progress);
    }

    if (countReady) {
        countReady.textContent = String(counters.ready);
    }
};

const formatDate = (value) => {
    if (!value) {
        return "Sin fecha";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
};

const renderHistory = (pedidos = pedidosCache) => {
    if (!historyList || !historyEmpty || !historyCount) {
        return;
    }

    const query = String(historySearch?.value || "").trim().toLowerCase();
    const filtered = pedidos
        .filter((pedido) => isToday(getPedidoDateValue(pedido)))
        .filter((pedido) => {
        const searchText = [
            getPedidoId(pedido),
            getPedidoClient(pedido),
            getPedidoStatus(pedido),
            getPedidoDescription(pedido)
        ].join(" ").toLowerCase();

        return !query || searchText.includes(query);
    })
        .sort((a, b) => new Date(getPedidoDateValue(b)).getTime() - new Date(getPedidoDateValue(a)).getTime());
    const visiblePedidos = filtered.slice(0, historyVisibleCount);

    historyList.innerHTML = "";
    historyCount.textContent = `${filtered.length} ${filtered.length === 1 ? "pedido" : "pedidos"}`;

    if (!filtered.length) {
        historyEmpty.hidden = false;
        if (historyMore) {
            historyMore.hidden = true;
        }
        return;
    }

    historyEmpty.hidden = true;

    visiblePedidos.forEach((pedido) => {
        const statusInfo = getHistoryStatusInfo(pedido);
        const item = document.createElement("article");
        item.className = "employee-history-item";
        item.innerHTML = `
            <div>
                <h3>#${String(getPedidoId(pedido)).slice(0, 12)}</h3>
                <p>${getPedidoClient(pedido)}</p>
                <p>${getPedidoDescription(pedido)}</p>
            </div>
            <div class="employee-history-meta">
                <span class="employee-history-status ${statusInfo.className}">${statusInfo.label}</span>
                <span>${formatDate(getPedidoDateValue(pedido))}</span>
                <strong>S/ ${getPedidoTotal(pedido).toFixed(2)}</strong>
            </div>
        `;
        historyList.appendChild(item);
    });

    if (historyMore) {
        historyMore.hidden = visiblePedidos.length >= filtered.length;
    }
};

const loadPedidos = async ({ silent = false } = {}) => {
    if (employeeOrdersLoading) {
        return;
    }

    employeeOrdersLoading = true;

    try {
        const response = await fetch(employeeOrdersApiUrl, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudieron cargar los pedidos.");
        }

        pedidosCache = Array.isArray(payload.pedidos) ? payload.pedidos : [];
        refreshOrdersView();
    } catch (error) {
        if (!silent) {
            pedidosCache = [];
            refreshOrdersView();
            console.error(error);
        }
    } finally {
        employeeOrdersLoading = false;
    }
};

const startPedidosRealtime = () => {
    window.clearInterval(employeeOrdersTimer);
    employeeOrdersTimer = window.setInterval(() => {
        if (document.hidden) {
            return;
        }

        loadPedidos({ silent: true });
    }, employeeOrdersRefreshMs);
};

const user = getEmployeeUser();
const role = normalizeRole(user?.rol || user?.rango);

if (role !== "empleado") {
    window.location.href = "/assets/pages/login/";
} else {
    currentEmployee = user;
    setEmployeeName(user);
    loadEmployeeProfile(user);
    loadPedidos();
    startPedidosRealtime();
}

employeeTabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
        event.preventDefault();
        showSection(tab.dataset.employeeTab);
    });
});

profilePhoneInput?.addEventListener("input", () => {
    profilePhoneInput.value = profilePhoneInput.value.replace(/\D/g, "").slice(0, 9);
    setProfileStatus("");
    updateProfileState();
});

[profileNameInput, profileEmailInput].forEach((input) => {
    input?.addEventListener("input", () => {
        setProfileStatus("");
        updateProfileState();
    });
});

profileCancel?.addEventListener("click", () => {
    if (originalProfile) {
        fillProfile(originalProfile);
        setProfileStatus("");
    }
});

profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentEmployee || !originalProfile) {
        showEmployeeModal({
            title: "No se pudo guardar",
            message: "Inicia sesion nuevamente para actualizar tu perfil.",
            type: "error"
        });
        return;
    }

    const validation = validateProfile(getCurrentProfileValues());

    if (validation.message) {
        showEmployeeModal({
            title: "Revisa tus datos",
            message: validation.message,
            type: "error"
        });
        return;
    }

    setProfileLoading(true);
    setProfileStatus("");

    try {
        const response = await fetch(employeeProfileApiUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: currentEmployee.id || originalProfile.id,
                currentEmail: originalProfile.email,
                ...validation.data
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudo guardar el perfil.");
        }

        fillProfile({
            ...currentEmployee,
            ...payload.user
        });
        showEmployeeModal({
            title: "Cambios guardados",
            message: "Tus datos se actualizaron correctamente.",
            type: "success"
        });
    } catch (error) {
        showEmployeeModal({
            title: "No se pudo guardar",
            message: error.message || "No se pudo guardar el perfil.",
            type: "error"
        });
    } finally {
        setProfileLoading(false);
        updateProfileState();
    }
});

historySearch?.addEventListener("input", () => {
    historyVisibleCount = historyPageSize;
    renderHistory(pedidosCache);
});

historyMore?.addEventListener("click", () => {
    historyVisibleCount += historyPageSize;
    renderHistory(pedidosCache);
});

const handleOrderActionClick = (event) => {
    const actionButton = event.target.closest("[data-order-action]");

    if (!actionButton) {
        return;
    }

    const id = actionButton.dataset.orderId;
    const accion = actionButton.dataset.orderAction;

    if (!id || !accion) {
        return;
    }

    if (accion === "rechazar") {
        openRejectModal(id);
        return;
    }

    updatePedidoStatus({ id, accion });
};

pendingOrdersList?.addEventListener("click", handleOrderActionClick);
progressOrdersList?.addEventListener("click", handleOrderActionClick);

rejectConfirmButton?.addEventListener("click", () => {
    const motivo = rejectReasonInput?.value.trim() || "";

    if (motivo.length < 6) {
        if (rejectStatus) {
            rejectStatus.textContent = "Escribe un motivo claro antes de rechazar.";
        }
        return;
    }

    const id = rejectOrderId;
    closeRejectModal();
    updatePedidoStatus({ id, accion: "rechazar", motivo });
});

rejectCancelButtons.forEach((button) => {
    button.addEventListener("click", closeRejectModal);
});

employeeLogout?.addEventListener("click", logoutEmployee);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        loadPedidos({ silent: true });
    }
});

modalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeEmployeeModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && rejectModal && !rejectModal.hidden) {
        closeRejectModal();
        return;
    }

    if (event.key === "Escape" && employeeModal && !employeeModal.hidden) {
        closeEmployeeModal();
    }
});

const initialSection = location.hash ? location.hash.slice(1) : "ordenes";
showSection(sectionTitles[initialSection] ? initialSection : "ordenes");
