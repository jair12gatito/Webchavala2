const API = "http://localhost:3000";
const getAdminUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem("chavalaUser") || sessionStorage.getItem("chavalaUser")
        ) || null;
    } catch {
        return null;
    }
};

const user = getAdminUser();
const role = String(user?.rol || user?.rango || "").toLowerCase().trim();

if (!user || role !== "admin") {
    window.location.href = "/assets/pages/login/";
}

document.getElementById("adminName").textContent = user?.nombre || "Admin";
document.getElementById("dashDate").textContent = new Intl.DateTimeFormat("es-PE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
}).format(new Date()).replace(/^\w/, c => c.toUpperCase());

let cacheEmpleados = [];
let cacheProductos = [];
let cachePedidos = [];
let cacheProveedores = [];
let editingPedidoId = null;
let editingProductoId = null;
let editingProveedorId = null;

const sectionTitles = {
    dashboard: "Dashboard Overview",
    empleados: "Gestión de Empleados",
    productos: "Gestión de Productos",
    proveedores: "Gestión de Proveedores",
    pedidos: "Ver Pedidos"
};

function showSection(id) {
    document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("is-active"));
    document.querySelectorAll(".nav-link").forEach(l => {
        l.classList.toggle("is-active", l.dataset.section === id);
    });
    const target = document.getElementById("section-" + id);
    if (target) target.classList.add("is-active");
    document.getElementById("topbarTitle").textContent = sectionTitles[id] || "";
}

document.querySelectorAll(".nav-link").forEach(btn => {
    btn.addEventListener("click", () => showSection(btn.dataset.section));
});

const fmt = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? "—" : new Intl.DateTimeFormat("es-PE", {
        day: "2-digit", month: "short", year: "numeric"
    }).format(d);
};

const initials = (name) => String(name || "?").trim().split(" ")
    .slice(0, 2).map(w => w[0]).join("").toUpperCase();

const statusBadge = (estado) => {
    const e = String(estado || "").toLowerCase().trim();
    if (e === "pendiente") return `<span class="badge badge-pending">Pendiente</span>`;
    if (e.includes("prepara")) return `<span class="badge badge-prep">Preparando</span>`;
    if (e === "listo") return `<span class="badge badge-ready">Listo</span>`;
    if (e === "rechazado") return `<span class="badge badge-rejected">Rechazado</span>`;
    if (e === "aceptado") return `<span class="badge badge-prep">Aceptado</span>`;
    return `<span class="badge badge-inactive">${estado || "—"}</span>`;
};

const emptyRow = (cols, msg) =>
    `<tr><td colspan="${cols}"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        <h3>${msg}</h3><p>No hay registros que mostrar.</p>
    </div></td></tr>`;

const apiFetch = async (path, opts = {}) => {
    const res = await fetch(API + path, {
        headers: { "Content-Type": "application/json" },
        ...opts
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Error en la solicitud.");
    return data;
};

const loadEmpleados = async () => {
    try {
        const data = await apiFetch("/api/admin/empleados");
        cacheEmpleados = Array.isArray(data.empleados || data) ? (data.empleados || data) : [];
    } catch {
        cacheEmpleados = [];
    }
    renderEmpleados();
    renderDashEmpleados();
    document.getElementById("statEmpleados").textContent = cacheEmpleados.length;
};

const loadProductos = async () => {
    try {
        const data = await apiFetch("/api/productos");
        cacheProductos = Array.isArray(data) ? data : [];
    } catch {
        cacheProductos = [];
    }
    renderProductos();
    renderDashProductos();
    document.getElementById("statProductos").textContent = cacheProductos.length;
};

const loadPedidos = async () => {
    try {
        const data = await apiFetch("/api/empleados/pedidos");
        cachePedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
    } catch {
        cachePedidos = [];
    }
    renderPedidos();
    renderDashPedidos();
    const pending = cachePedidos.filter(p =>
        String(p.estado || "").toLowerCase() === "pendiente"
    ).length;
    document.getElementById("statPending").textContent = pending;
    document.getElementById("statTotal").textContent = cachePedidos.length;
};
const loadProveedores = async () => {
    try {
        const data = await apiFetch("/api/admin/proveedores");
        cacheProveedores = Array.isArray(data.proveedores)
            ? data.proveedores
            : Array.isArray(data)
                ? data
                : [];
    } catch {
        cacheProveedores = [];
    }

    renderProveedores();
    
};

const renderEmpleados = (query = "") => {
    const q = query.toLowerCase();
    const list = cacheEmpleados.filter(e =>
        !q ||
        String(e.nombre || "").toLowerCase().includes(q) ||
        String(e.email || "").toLowerCase().includes(q)
    );

    const tbody = document.getElementById("empleadosBody");
    if (!list.length) { tbody.innerHTML = emptyRow(6, "Sin empleados"); return; }

    tbody.innerHTML = list.map(e => {
        const nombre = e.nombre || e.name || "—";
        const email = e.email || "—";
        const rol = e.rol || e.rango || "empleado";
        const dni = e.dni || "—";
        const cel = e.celular || "—";
        return `<tr>
            <td><div class="user-cell">
                <div class="avatar">${initials(nombre)}</div>
                <div class="user-cell-info">
                    <strong>${nombre}</strong>
                    <span>${email}</span>
                </div>
            </div></td>
            <td>${dni}</td>
            <td>${cel}</td>
            <td>${rol}</td>
            <td><span class="badge badge-active">Activo</span></td>
            <td><div class="actions-cell">
                <button class="icon-btn danger" onclick="confirmarEliminarEmpleado('${e.id}','${nombre.replace(/'/g, "\\'")}')">
                    <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div></td>
        </tr>`;
    }).join("");
};

const renderDashEmpleados = () => {
    const tbody = document.getElementById("dashEmpleadosBody");
    const list = cacheEmpleados.slice(0, 5);
    if (!list.length) { tbody.innerHTML = emptyRow(3, "Sin empleados"); return; }
    tbody.innerHTML = list.map(e => {
        const nombre = e.nombre || "—";
        const rol = e.rol || e.rango || "empleado";
        return `<tr>
            <td><div class="user-cell">
                <div class="avatar">${initials(nombre)}</div>
                <div class="user-cell-info">
                    <strong>${nombre}</strong>
                    <span>${e.email || ""}</span>
                </div>
            </div></td>
            <td>${rol}</td>
            <td><span class="badge badge-active">Activo</span></td>
        </tr>`;
    }).join("");
};
const renderProductos = (query = "") => {
    const q = query.toLowerCase();
    const list = cacheProductos.filter(p =>
        !q ||
        String(p.nombre || "").toLowerCase().includes(q) ||
        String(p.categoria || "").toLowerCase().includes(q)
    );

    const tbody = document.getElementById("productosBody");
    if (!list.length) { tbody.innerHTML = emptyRow(5, "Sin productos"); return; }

    tbody.innerHTML = list.map(p => `<tr>
        <td><div class="prod-cell">
            <div class="prod-thumb">
                <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <strong>${p.nombre || "—"}</strong>
        </div></td>
        <td>${p.categoria || p.category || "—"}</td>
        <td>${fmt(p.precio || p.price)}</td>
        <td>${p.stock ?? "—"}</td>
        <td><div class="actions-cell">
            <button class="icon-btn" onclick="abrirEditarProducto(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
            </button>
            <button class="icon-btn danger" onclick="confirmarEliminarProducto('${p.id}','${String(p.nombre || "").replace(/'/g, "\\'")}')">
                <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div></td>
    </tr>`).join("");
};

const renderDashProductos = () => {
    const tbody = document.getElementById("dashProductosBody");
    const list = cacheProductos.slice(0, 5);
    if (!list.length) { tbody.innerHTML = emptyRow(4, "Sin productos"); return; }
    tbody.innerHTML = list.map(p => `<tr>
        <td>${p.nombre || "—"}</td>
        <td>${p.categoria || p.category || "—"}</td>
        <td>${fmt(p.precio || p.price)}</td>
        <td><button class="icon-btn" onclick="abrirEditarProducto(${JSON.stringify(p).replace(/"/g, '&quot;')})">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
        </button></td>
    </tr>`).join("");
};

const renderPedidos = (query = "", filtro = "") => {
    const q = query.toLowerCase();
    const list = cachePedidos.filter(p => {
        const cliente = String(p.usuarios?.nombre || p.cliente_nombre || "").toLowerCase();
        const id = String(p.id || "").toLowerCase();
        const estado = String(p.estado || "").toLowerCase();
        const matchQ = !q || cliente.includes(q) || id.includes(q);
        const matchF = !filtro || estado === filtro;
        return matchQ && matchF;
    });

    const tbody = document.getElementById("pedidosBody");
    if (!list.length) { tbody.innerHTML = emptyRow(7, "Sin pedidos"); return; }

    tbody.innerHTML = list.map(p => {
        const cliente = p.usuarios?.nombre || p.cliente_nombre || "Cliente";
        const desc = String(p.descripcion || "").slice(0, 50) || "—";
        return `<tr>
            <td style="font-family:monospace;font-size:11px">#${String(p.id).slice(0, 8)}</td>
            <td>${cliente}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${desc}</td>
            <td>${fmtDate(p.created_at || p.fecha)}</td>
            <td>${fmt(p.total)}</td>
            <td>${statusBadge(p.estado)}</td>
            <td><button class="icon-btn" onclick="abrirCambioEstado('${p.id}','${p.estado || "pendiente"}','${cliente.replace(/'/g, "\\'")}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
            </button></td>
        </tr>`;
    }).join("");
};

const renderDashPedidos = () => {
    const tbody = document.getElementById("dashPedidosBody");
    const list = cachePedidos.slice(0, 5);
    if (!list.length) { tbody.innerHTML = emptyRow(4, "Sin pedidos"); return; }
    tbody.innerHTML = list.map(p => {
        const cliente = p.usuarios?.nombre || p.cliente_nombre || "Cliente";
        return `<tr>
            <td style="font-family:monospace;font-size:11px">#${String(p.id).slice(0, 8)}</td>
            <td>${cliente}</td>
            <td>${fmt(p.total)}</td>
            <td>${statusBadge(p.estado)}</td>
        </tr>`;
    }).join("");
};
const renderProveedores = (query = "") => {

    const q = query.toLowerCase();

    const list = cacheProveedores.filter(p =>
        !q ||
        String(p.nombre || "").toLowerCase().includes(q)
    );

    const tbody = document.getElementById("proveedoresBody");

    if (!list.length) {
        tbody.innerHTML = emptyRow(4, "Sin proveedores");
        return;
    }

    tbody.innerHTML = list.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.ruc}</td>
            <td>${p.telefono}</td>
            <td>${p.direccion}</td>
        </tr>
    `).join("");

};

document.getElementById("empleadoSearch").addEventListener("input", e => renderEmpleados(e.target.value));
document.getElementById("productoSearch").addEventListener("input", e => renderProductos(e.target.value));
document.getElementById("proveedorSearch").addEventListener("input", e => {renderProveedores(e.target.value);});
document.getElementById("pedidoSearch").addEventListener("input", () => {
    renderPedidos(
        document.getElementById("pedidoSearch").value,
        document.getElementById("pedidoFilter").value
    );
});

document.getElementById("pedidoFilter").addEventListener("change", () => {
    renderPedidos(
        document.getElementById("pedidoSearch").value,
        document.getElementById("pedidoFilter").value
    );
});
const openModal = id => document.getElementById(id).classList.remove("hidden");
const closeModal = id => document.getElementById(id).classList.add("hidden");
[
    "modalEmpleado",
    "modalProducto",
    "modalPedido",
    "modalProveedor"
].forEach(id => {
    document.getElementById(id).addEventListener("click", e => {
        if (e.target === e.currentTarget) closeModal(id);
    });
});
document.getElementById("btnNuevoEmpleado").addEventListener("click", () => {
    document.getElementById("modalEmpleadoTitle").textContent = "Nuevo Empleado";
    document.getElementById("empNombre").value = "";
    document.getElementById("empEmail").value = "";
    document.getElementById("empPassword").value = "";
    document.getElementById("empDni").value = "";
    document.getElementById("empCelular").value = "";
    document.getElementById("modalEmpleadoStatus").textContent = "";
    openModal("modalEmpleado");
});

document.getElementById("cancelEmpleado").addEventListener("click", () => closeModal("modalEmpleado"));

document.getElementById("saveEmpleado").addEventListener("click", async () => {
    const statusEl = document.getElementById("modalEmpleadoStatus");
    statusEl.textContent = "";

    const nombre = document.getElementById("empNombre").value.trim();
    const email = document.getElementById("empEmail").value.trim();
    const password = document.getElementById("empPassword").value;
    const dni = document.getElementById("empDni").value.trim();
    const celular = document.getElementById("empCelular").value.trim();

    if (!nombre || !email || !password || !dni || !celular) {
        statusEl.textContent = "Completa todos los campos.";
        return;
    }

    const btn = document.getElementById("saveEmpleado");
    btn.disabled = true;
    btn.textContent = "Registrando...";

    try {
        await apiFetch("/api/auth/empleados", {
            method: "POST",
            body: JSON.stringify({
                nombre, email,
                contrasena: password,
                confirmarContrasena: password,
                dni, celular,
                rol: "Empleado"
            })
        });
        closeModal("modalEmpleado");
        await loadEmpleados();
    } catch (err) {
        statusEl.textContent = err.message || "No se pudo registrar.";
    } finally {
        btn.disabled = false;
        btn.textContent = "Registrar empleado";
    }
});

window.confirmarEliminarEmpleado = (id, nombre) => {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    alert("Endpoint de eliminación no implementado aún.");
};
document.getElementById("btnNuevoProducto").addEventListener("click", () => {
    editingProductoId = null;
    document.getElementById("modalProductoTitle").textContent = "Nuevo Producto";
    document.getElementById("prodNombre").value = "";
    document.getElementById("prodCategoria").value = "";
    document.getElementById("prodPrecio").value = "";
    document.getElementById("prodDescripcion").value = "";
    document.getElementById("modalProductoStatus").textContent = "";
    openModal("modalProducto");
});
document.getElementById("btnNuevoProveedor")
    .addEventListener("click", () => {

        editingProveedorId = null;

        document.getElementById("provNombre").value = "";
        document.getElementById("provRuc").value = "";
        document.getElementById("provTelefono").value = "";
        document.getElementById("provDireccion").value = "";

        document.getElementById("modalProveedorStatus").textContent = "";

        openModal("modalProveedor");

    });

window.abrirEditarProducto = (p) => {
    editingProductoId = p.id;
    document.getElementById("modalProductoTitle").textContent = "Editar Producto";
    document.getElementById("prodNombre").value = p.nombre || "";
    document.getElementById("prodCategoria").value = p.categoria || p.category || "";
    document.getElementById("prodPrecio").value = p.precio || p.price || "";
    document.getElementById("prodDescripcion").value = p.descripcion || "";
    document.getElementById("modalProductoStatus").textContent = "";
    openModal("modalProducto");
};

document.getElementById("cancelProducto").addEventListener("click", () => closeModal("modalProducto"));
document.getElementById("cancelProveedor")
    .addEventListener("click", () => {

        closeModal("modalProveedor");

    });
document.getElementById("saveProducto").addEventListener("click", async () => {
    const statusEl = document.getElementById("modalProductoStatus");
    statusEl.textContent = "";

    const nombre = document.getElementById("prodNombre").value.trim();
    const categoria = document.getElementById("prodCategoria").value.trim();
    const precio = parseFloat(document.getElementById("prodPrecio").value);
    const descripcion = document.getElementById("prodDescripcion").value.trim();

    if (!nombre || !categoria || isNaN(precio)) {
        statusEl.textContent = "Completa nombre, categoría y precio.";
        return;
    }

    const btn = document.getElementById("saveProducto");
    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        const body = { nombre, categoria, precio, descripcion };

        if (editingProductoId) {
            await apiFetch(`/api/productos/${editingProductoId}`, {
                method: "PATCH",
                body: JSON.stringify(body)
            });
        } else {
            await apiFetch("/api/productos", {
                method: "POST",
                body: JSON.stringify(body)
            });
        }

        closeModal("modalProducto");
        await loadProductos();
    } catch (err) {
        statusEl.textContent = err.message || "No se pudo guardar el producto.";
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar producto";
    }
});
document.getElementById("saveProveedor")
.addEventListener("click", async () => {

    const status = document.getElementById("modalProveedorStatus");

    status.textContent = "";

    const nombre = document.getElementById("provNombre").value.trim();
    const ruc = document.getElementById("provRuc").value.trim();
    const telefono = document.getElementById("provTelefono").value.trim();
    const direccion = document.getElementById("provDireccion").value.trim();

    if (!nombre || !ruc) {
        status.textContent = "Completa los datos.";
        return;
    }

    try {

        await apiFetch("/api/admin/proveedores", {
            method: "POST",
            body: JSON.stringify({
                nombre,
                ruc_dni: ruc,
                telefono,
                direccion
            })
        });

        closeModal("modalProveedor");

        await loadProveedores();

    } catch (err) {

        status.textContent = err.message;

    }

});
window.confirmarEliminarProducto = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
        await apiFetch(`/api/productos/${id}`, { method: "DELETE" });
        await loadProductos();
    } catch (err) {
        alert(err.message || "No se pudo eliminar el producto.");
    }
};
window.abrirCambioEstado = (id, estadoActual, cliente) => {
    editingPedidoId = id;
    document.getElementById("modalPedidoDesc").textContent = `Pedido de ${cliente}`;
    document.getElementById("pedidoEstado").value = estadoActual;
    document.getElementById("pedidoMotivo").value = "";
    document.getElementById("modalPedidoStatus").textContent = "";
    const motivoField = document.getElementById("motivoField");
    motivoField.style.display = estadoActual === "rechazado" ? "block" : "none";
    openModal("modalPedido");
};

document.getElementById("pedidoEstado").addEventListener("change", e => {
    document.getElementById("motivoField").style.display =
        e.target.value === "rechazado" ? "block" : "none";
});

document.getElementById("cancelPedido").addEventListener("click", () => closeModal("modalPedido"));

document.getElementById("savePedido").addEventListener("click", async () => {
    const statusEl = document.getElementById("modalPedidoStatus");
    statusEl.textContent = "";

    const estado = document.getElementById("pedidoEstado").value;
    const motivo = document.getElementById("pedidoMotivo").value.trim();
    const btn = document.getElementById("savePedido");

    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        await apiFetch(`/api/empleados/pedidos/${editingPedidoId}`, {
            method: "PATCH",
            body: JSON.stringify({ estado, motivo_rechazo: motivo })
        });
        closeModal("modalPedido");
        await loadPedidos();
    } catch (err) {
        statusEl.textContent = err.message || "No se pudo actualizar.";
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar cambio";
    }
});
document.getElementById("adminLogout").addEventListener("click", () => {
    localStorage.removeItem("chavalaUser");
    sessionStorage.removeItem("chavalaUser");
    window.location.href = "/assets/pages/login/";
});
Promise.all([loadEmpleados(), loadProductos(), loadPedidos(),loadProveedores()],);