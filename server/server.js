const path = require("path");
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const productsTable = process.env.SUPABASE_PRODUCTS_TABLE || "productos";
const usersTable = process.env.SUPABASE_USERS_TABLE || "usuarios";
const ordersTable = process.env.SUPABASE_ORDERS_TABLE || "pedidos";
const providersTable = process.env.SUPABASE_PROVIDERS_TABLE || "proveedores";
const userPasswordColumn = process.env.SUPABASE_USER_PASSWORD_COLUMN || "contrasena";
const customerRole = process.env.SUPABASE_CUSTOMER_ROLE || "Cliente";
const profilesTables = (process.env.SUPABASE_PROFILES_TABLES || process.env.SUPABASE_PROFILES_TABLE || "usuarios,perfiles,profiles")
    .split(",")
    .map((table) => table.trim())
    .filter(Boolean);
const allowedRoles = new Set(["usuario", "cliente", "admin", "empleado"]);
const completedOrderMarker = "__PEDIDO_COMPLETO__";
const publicRoot = path.join(__dirname, "..");
const catalogPath = path.join(publicRoot, "assets", "pages", "catalog", "catalog.html");
const catalogUrl = "/assets/pages/catalog/catalog.html";
const employeeUrl = "/assets/pages/employee/orders.html";
const adminUrl = "/assets/pages/admin/admin.html";
const homeUrl = "/index.html";

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el archivo .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const normalizeRole = (value) => {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

const getRoleFromRecord = (record) => {
    if (!record) {
        return "";
    }

    return record.rango || record.rol || record.role || record.tipo || "";
};

const getNameFromRecord = (record) => {
    if (!record) {
        return "";
    }

    return record.nombre || record.name || record.full_name || record.email || "";
};

const normalizeText = (value) => {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]+(?:\s+[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]+)*$/;
const peruvianPhonePattern = /^9\d{8}$/;
const dniPattern = /^\d{8}$/;

const getCleanProfileInput = (body) => {
    return {
        id: String(body?.id || "").trim(),
        currentEmail: String(body?.currentEmail || "").trim().toLowerCase(),
        nombre: String(body?.nombre || "").trim().replace(/\s+/g, " "),
        email: String(body?.email || "").trim().toLowerCase(),
        celular: String(body?.celular || "").replace(/\s+/g, "")
    };
};

const getCleanRegisterInput = (body) => {
    return {
        nombre: String(body?.nombre || body?.name || "").trim().replace(/\s+/g, " "),
        email: String(body?.email || "").trim().toLowerCase(),
        contrasena: String(body?.contrasena || body?.password || ""),
        confirmarContrasena: String(body?.confirmarContrasena || body?.confirmPassword || ""),
        dni: String(body?.dni || "").replace(/\D/g, ""),
        celular: String(body?.celular || "").replace(/\D/g, "")
    };
};

const validateRegisterInput = ({ nombre, email, contrasena, confirmarContrasena, dni, celular }) => {
    if (!nombre || !email || !contrasena || !confirmarContrasena || !dni || !celular) {
        return "Completa todos los campos para crear tu cuenta.";
    }

    if (!namePattern.test(nombre)) {
        return "El nombre solo puede tener letras y espacios.";
    }

    if (!emailPattern.test(email)) {
        return "Ingresa un correo electronico valido.";
    }

    if (!dniPattern.test(dni)) {
        return "Ingresa un DNI valido de 8 digitos.";
    }

    if (!peruvianPhonePattern.test(celular)) {
        return "Ingresa un celular peruano valido de 9 digitos que empiece con 9.";
    }

    if (contrasena.length < 8) {
        return "La contrasena debe tener minimo 8 caracteres.";
    }

    if (contrasena !== confirmarContrasena) {
        return "Las contrasenas no coinciden.";
    }

    return "";
};

const validateProfileInput = ({ nombre, email, celular }) => {
    if (!nombre || !email || !celular) {
        return "Completa todos los campos antes de guardar.";
    }

    if (!namePattern.test(nombre)) {
        return "El nombre solo puede tener letras y espacios.";
    }

    if (!emailPattern.test(email)) {
        return "Ingresa un correo electronico valido.";
    }

    if (!peruvianPhonePattern.test(celular)) {
        return "Ingresa un celular peruano valido de 9 digitos que empiece con 9.";
    }

    return "";
};

const getCleanPasswordInput = (body) => {
    return {
        id: String(body?.id || "").trim(),
        currentEmail: String(body?.currentEmail || "").trim().toLowerCase(),
        currentPassword: String(body?.currentPassword || ""),
        newPassword: String(body?.newPassword || ""),
        confirmPassword: String(body?.confirmPassword || "")
    };
};

const validatePasswordInput = ({ currentPassword, newPassword, confirmPassword }) => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
        return "Completa todos los campos antes de actualizar tu contrasena.";
    }

    if (newPassword.length < 8) {
        return "La nueva contrasena debe tener minimo 8 caracteres.";
    }

    if (newPassword !== confirmPassword) {
        return "Las contrasenas nuevas no coinciden.";
    }

    if (currentPassword === newPassword) {
        return "La nueva contrasena debe ser diferente a la actual.";
    }

    return "";
};

const getPublicUser = (user) => {
    return {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        dni: user.dni || "",
        celular: user.celular || "",
        rango: getRoleFromRecord(user),
        rol: getRoleFromRecord(user)
    };
};

const getRoleFromMetadata = (user) => {
    return getRoleFromRecord(user?.user_metadata) || getRoleFromRecord(user?.app_metadata);
};

const getNameFromMetadata = (user) => {
    return getNameFromRecord(user?.user_metadata) || user?.email || "";
};

const getRedirectByRole = (role) => {
    const cleanRole = normalizeRole(role);

    if (cleanRole === "usuario" || cleanRole === "cliente") {
        return catalogUrl;
    }

    if (cleanRole === "empleado") {
        return employeeUrl;
    }

    if (cleanRole === "admin") {
        return adminUrl;
    }

    return homeUrl;
};

const createSessionClient = (accessToken) => {
    return createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
};

const getUserProfileRole = async (session, user) => {
    const metadataRole = getRoleFromMetadata(user);

    if (metadataRole) {
        return metadataRole;
    }

    if (!session?.access_token || !user) {
        return "";
    }

    const sessionSupabase = createSessionClient(session.access_token);
    const profileFilters = [
        ["id", user.id],
        ["user_id", user.id],
        ["auth_id", user.id],
        ["email", user.email]
    ].filter(([, value]) => Boolean(value));

    for (const table of profilesTables) {
        for (const [column, value] of profileFilters) {
            const { data, error } = await sessionSupabase
                .from(table)
                .select("*")
                .eq(column, value)
                .maybeSingle();

            if (error) {
                continue;
            }

            const profileRole = getRoleFromRecord(data);

            if (profileRole) {
                return profileRole;
            }
        }
    }

    return "";
};

const loginWithUsersTable = async (email, password) => {
    const { data: user, error } = await supabase
        .from(usersTable)
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (error || !user) {
        return { checked: false };
    }

    if (String(user[userPasswordColumn] || "") !== password) {
        return { checked: true, ok: false };
    }

    return {
        checked: true,
        ok: true,
        user,
        role: getRoleFromRecord(user)
    };
};

app.use(cors());
app.use(express.json());
app.use("/assets", express.static(path.join(publicRoot, "assets")));
app.use("/css", express.static(path.join(publicRoot, "css")));
app.use("/js", express.static(path.join(publicRoot, "js")));

app.get(["/", "/index.html"], (req, res) => {
    res.sendFile(path.join(publicRoot, "index.html"));
});

app.get(["/catalogo", "/catalogo/"], (req, res) => {
    res.sendFile(catalogPath);
});

app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "Chavala API", database: "supabase" });
});

app.get("/api/productos", async (req, res) => {
    try {
        const { data: productos, error } = await supabase
            .from(productsTable)
            .select("*")
            .order("nombre", { ascending: true });

        if (error) {
            throw error;
        }

        res.json(productos || []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudieron obtener los productos" });
    }
});

app.get("/api/empleados/pedidos", async (req, res) => {
    try {
        const { data: pedidos, error } = await supabase
            .from(ordersTable)
            .select("*, usuarios(nombre,email), pedido_detalles(*, productos(nombre,precio))")
            .limit(80);

        if (error) {
            if (error.code === "42P01" || error.code === "PGRST205") {
                res.json({ ok: true, pedidos: [] });
                return;
            }

            throw error;
        }

        res.json({ ok: true, pedidos: pedidos || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudieron cargar los pedidos." });
    }
});

app.get("/api/pedidos/seguimiento", async (req, res) => {
    const code = String(req.query?.codigo || "").trim();

    if (!code) {
        res.status(400).json({ message: "Ingresa el numero de pedido para buscarlo." });
        return;
    }

    try {
        const { data: pedidos, error } = await supabase
            .from(ordersTable)
            .select("*, pedido_detalles(*, productos(nombre,precio))")
            .limit(200);

        if (error) {
            if (error.code === "42P01" || error.code === "PGRST205") {
                res.status(404).json({ found: false, message: "Todavia no hay pedidos registrados." });
                return;
            }

            throw error;
        }

        const cleanCode = normalizeText(code).replace(/^#/, "");
        const codeFields = ["id", "codigo", "codigo_pedido", "numero", "numero_pedido", "pedido_id", "tracking", "tracking_code"];
        const pedido = (pedidos || []).find((item) => {
            return codeFields.some((field) => {
                const value = normalizeText(item?.[field]).replace(/^#/, "");
                return value === cleanCode || (cleanCode.length >= 8 && value.startsWith(cleanCode));
            });
        });

        if (!pedido) {
            res.status(404).json({ found: false, message: "No encontramos un pedido con ese codigo." });
            return;
        }

        const rawStatus = pedido.estado || pedido.status || pedido.estado_pedido || pedido.situacion || "";
        const isCompleted = pedido.motivo_rechazo === completedOrderMarker;
        const cleanStatus = normalizeText(rawStatus);
        let estadoNormalizado = "pendiente";

        if (/acept|prepar|proceso|curso/.test(cleanStatus)) {
            estadoNormalizado = "proceso";
        }

        if (/pend|registr|nuevo|solicit/.test(cleanStatus) || !cleanStatus) {
            estadoNormalizado = "pendiente";
        }

        if (isCompleted || /list|ready|recojo|recoger|complet|final/.test(cleanStatus)) {
            estadoNormalizado = "listo";
        }

        if (/rechaz|cancel|anulad/.test(cleanStatus)) {
            estadoNormalizado = "rechazado";
        }

        res.json({
            ok: true,
            found: true,
            pedido: {
                codigo: pedido.codigo || pedido.codigo_pedido || pedido.numero_pedido || pedido.numero || pedido.id,
                cliente: pedido.cliente || pedido.nombre_cliente || pedido.nombre || "",
                estado: rawStatus || "Pendiente",
                estadoNormalizado,
                total: pedido.total || pedido.monto || pedido.precio_total || "",
                fecha: pedido.fecha || pedido.created_at || pedido.fecha_pedido || "",
                motivo_rechazo: estadoNormalizado === "rechazado" ? (pedido.motivo_rechazo || pedido.motivo || "") : ""
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo consultar el seguimiento del pedido." });
    }
});

app.get("/api/clientes/compras", async (req, res) => {
    const id = String(req.query?.id || "").trim();
    const email = String(req.query?.email || "").trim().toLowerCase();

    if (!id && !email) {
        res.status(400).json({ message: "No se pudo identificar al cliente." });
        return;
    }

    try {
        const { data: pedidos, error } = await supabase
            .from(ordersTable)
            .select("*, pedido_detalles(*, productos(nombre,precio))")
            .limit(200);

        if (error) {
            if (error.code === "42P01" || error.code === "PGRST205") {
                res.json({ ok: true, compras: [] });
                return;
            }

            throw error;
        }

        const matchesClient = (pedido) => {
            const idFields = ["usuario_id", "cliente_id", "user_id", "id_usuario", "id_cliente"];
            const emailFields = ["email", "cliente_email", "correo", "correo_cliente"];
            const hasId = id && idFields.some((field) => String(pedido?.[field] || "").trim() === id);
            const hasEmail = email && emailFields.some((field) => String(pedido?.[field] || "").trim().toLowerCase() === email);

            return hasId || hasEmail;
        };

        const getPedidoCode = (pedido) => {
            return pedido.codigo || pedido.codigo_pedido || pedido.numero_pedido || pedido.numero || pedido.id || "";
        };

        const getPedidoDate = (pedido) => {
            return pedido.fecha || pedido.fecha_pedido || pedido.created_at || pedido.updated_at || "";
        };

        const getPedidoProducts = (pedido) => {
            const value = pedido.productos || pedido.detalle || pedido.items || pedido.resumen || pedido.descripcion || "";
            const detalles = pedido.pedido_detalles || pedido.detalles;

            if (Array.isArray(detalles) && detalles.length) {
                return detalles.map((item) => {
                    const quantity = item.cantidad || item.qty || 1;
                    const name = item.productos?.nombre || item.producto?.nombre || item.nombre || item.producto || "Producto";
                    return `${quantity}x ${name}`;
                }).join(", ");
            }

            if (Array.isArray(value)) {
                return value.map((item) => {
                    if (typeof item === "string") {
                        return item;
                    }

                    const quantity = item.cantidad || item.qty || item.quantity || 1;
                    const name = item.nombre || item.producto || item.name || "Producto";
                    return `${quantity}x ${name}`;
                }).join(", ");
            }

            if (typeof value === "object" && value !== null) {
                return Object.values(value).join(", ");
            }

            return String(value || "Pedido registrado");
        };

        const getPedidoTotal = (pedido) => {
            const rawTotal = pedido.total || pedido.monto || pedido.precio_total || pedido.subtotal || "";
            const parsedTotal = Number(rawTotal);

            if (Number.isFinite(parsedTotal) && parsedTotal > 0) {
                return parsedTotal;
            }

            const detalles = pedido.pedido_detalles || pedido.detalles;

            if (Array.isArray(detalles) && detalles.length) {
                return detalles.reduce((sum, item) => {
                    const quantity = Number(item.cantidad || item.qty || 1);
                    const price = Number(item.precio || item.productos?.precio || item.producto?.precio || 0);
                    return sum + ((Number.isFinite(quantity) ? quantity : 1) * (Number.isFinite(price) ? price : 0));
                }, 0);
            }

            return "";
        };

        const compras = (pedidos || [])
            .filter(matchesClient)
            .map((pedido) => ({
                id: getPedidoCode(pedido),
                fecha: getPedidoDate(pedido),
                productos: getPedidoProducts(pedido),
                estado: pedido.motivo_rechazo === completedOrderMarker ? "listo" : (pedido.estado || pedido.status || pedido.estado_pedido || "Registrado"),
                total: getPedidoTotal(pedido),
                motivo_rechazo: normalizeText(pedido.estado || pedido.status || pedido.estado_pedido) === "rechazado" ? (pedido.motivo_rechazo || pedido.motivo || "") : ""
            }));

        res.json({ ok: true, compras });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudieron cargar tus compras." });
    }
});

app.post("/api/pedidos", async (req, res) => {
    const user = req.body?.cliente || req.body?.usuario || {};
    const items = Array.isArray(req.body?.productos) ? req.body.productos : [];
    const cleanItems = items.map((item) => {
        const cantidad = Math.max(1, Math.floor(Number(item?.cantidad || item?.quantity || 1)));
        const precio = Number(item?.precio || item?.priceNumber || 0);

        return {
            id: String(item?.id || "").trim(),
            nombre: String(item?.nombre || item?.name || "Producto").trim(),
            cantidad,
            precio: Number.isFinite(precio) ? precio : 0
        };
    }).filter((item) => item.nombre);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const productItems = cleanItems.filter((item) => uuidPattern.test(item.id));
    const itemsByProduct = productItems.reduce((map, item) => {
        const current = map.get(item.id) || { ...item, cantidad: 0 };
        current.cantidad += item.cantidad;
        map.set(item.id, current);
        return map;
    }, new Map());
    const total = cleanItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    if (!cleanItems.length) {
        res.status(400).json({ message: "Agrega productos antes de generar el pedido." });
        return;
    }

    if (!uuidPattern.test(String(user?.id || ""))) {
        res.status(401).json({ message: "Inicia sesion nuevamente para generar el pedido." });
        return;
    }

    if (itemsByProduct.size !== cleanItems.length) {
        res.status(400).json({ message: "No se pudo validar el stock de uno o mas productos." });
        return;
    }

    const orderCode = `CHV-${Date.now().toString().slice(-6)}`;
    const clientName = String(user?.nombre || user?.name || user?.email || "Cliente").trim();
    const description = cleanItems.map((item) => `${item.cantidad}x ${item.nombre}`).join(", ");

    try {
        const productIds = [...itemsByProduct.keys()];
        const { data: currentProducts, error: stockReadError } = await supabase
            .from(productsTable)
            .select("id,nombre,stock")
            .in("id", productIds);

        if (stockReadError) {
            throw stockReadError;
        }

        if (!currentProducts || currentProducts.length !== productIds.length) {
            res.status(404).json({ message: "Uno de los productos ya no esta disponible." });
            return;
        }

        const productStockById = new Map(currentProducts.map((product) => [String(product.id), product]));
        const stockUpdates = [];

        for (const [productId, item] of itemsByProduct) {
            const product = productStockById.get(productId);
            const currentStock = Number(product?.stock);

            if (!Number.isFinite(currentStock)) {
                res.status(400).json({ message: `No se pudo validar el stock de ${item.nombre}.` });
                return;
            }

            if (currentStock < item.cantidad) {
                res.status(409).json({ message: `No hay stock suficiente para ${product?.nombre || item.nombre}. Stock actual: ${Math.max(0, currentStock)}.` });
                return;
            }

            stockUpdates.push({
                id: productId,
                stock: Math.max(0, currentStock - item.cantidad)
            });
        }

        const { data: createdOrders, error } = await supabase
            .from(ordersTable)
            .insert({
                usuario_id: user.id,
                estado: "pendiente"
            })
            .select("*");

        if (error) {
            throw error;
        }

        const createdOrder = createdOrders?.[0];

        if (createdOrder?.id) {
            const detalles = productItems
                .map((item) => ({
                    pedido_id: createdOrder.id,
                    producto_id: item.id,
                    cantidad: item.cantidad
                }));

            if (detalles.length) {
                const { error: detailError } = await supabase
                    .from("pedido_detalles")
                    .insert(detalles);

                if (detailError) {
                    throw detailError;
                }
            }

            for (const item of stockUpdates) {
                const { error: stockUpdateError } = await supabase
                    .from(productsTable)
                    .update({ stock: item.stock })
                    .eq("id", item.id);

                if (stockUpdateError) {
                    throw stockUpdateError;
                }
            }
        }

        res.status(201).json({
            ok: true,
            pedido: {
                ...(createdOrder || {}),
                codigo: createdOrder?.id || orderCode,
                cliente: clientName,
                descripcion: description,
                total,
                estado: createdOrder?.estado || "pendiente",
                fecha: createdOrder?.created_at || new Date().toISOString()
            },
            productosActualizados: stockUpdates
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo generar el pedido." });
    }
});

app.patch("/api/empleados/pedidos/:id", async (req, res) => {
    const id = String(req.params?.id || "").trim();
    const action = normalizeText(req.body?.accion || req.body?.action || "");
    const motivo = String(req.body?.motivo || req.body?.motivo_rechazo || "").trim();
    const nextStateByAction = {
        aceptar: "aceptado",
        finalizar: "aceptado",
        rechazar: "rechazado"
    };
    const estado = nextStateByAction[action] || "";

    if (!id) {
        res.status(400).json({ message: "No se pudo identificar el pedido." });
        return;
    }

    if (!estado) {
        res.status(400).json({ message: "Selecciona una accion valida para el pedido." });
        return;
    }

    if (action === "rechazar" && motivo.length < 6) {
        res.status(400).json({ message: "Explica el motivo del rechazo para que el cliente pueda verlo." });
        return;
    }

    try {
        const updateData = {
            estado,
            motivo_rechazo: action === "rechazar" ? motivo : action === "finalizar" ? completedOrderMarker : null
        };
        const { data: updatedOrders, error } = await supabase
            .from(ordersTable)
            .update(updateData)
            .eq("id", id)
            .select("*, usuarios(nombre,email), pedido_detalles(*, productos(nombre,precio))");

        if (error) {
            throw error;
        }

        const updatedOrder = updatedOrders?.[0];

        if (!updatedOrder) {
            res.status(404).json({ message: "No se encontro el pedido." });
            return;
        }

        res.json({ ok: true, pedido: updatedOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo actualizar el pedido." });
    }
});

app.get("/api/admin/empleados", async (req, res) => {
    try {
        const { data: usuarios, error } = await supabase
            .from(usersTable)
            .select("id,nombre,email,dni,celular,rol")
            .limit(100);

        if (error) {
            throw error;
        }

        const empleados = (usuarios || []).filter((user) => {
            const role = normalizeText(getRoleFromRecord(user));
            return role === "empleado" || role === "admin";
        });

        res.json({ ok: true, empleados });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudieron cargar los empleados." });
    }
});

app.post("/api/admin/empleados", async (req, res) => {
    const employeeInput = {
        nombre: String(req.body?.nombre || "").trim().replace(/\s+/g, " "),
        dni: String(req.body?.dni || "").replace(/\D/g, ""),
        celular: String(req.body?.celular || "").replace(/\D/g, ""),
        email: String(req.body?.email || "").trim().toLowerCase(),
        contrasena: String(req.body?.contrasena || req.body?.password || ""),
        rol: String(req.body?.rol || "Empleado").trim()
    };

    if (!employeeInput.nombre || !employeeInput.dni || !employeeInput.celular || !employeeInput.email || !employeeInput.contrasena || !employeeInput.rol) {
        res.status(400).json({ message: "Completa todos los campos para guardar al empleado." });
        return;
    }

    if (!namePattern.test(employeeInput.nombre)) {
        res.status(400).json({ message: "El nombre solo puede tener letras y espacios." });
        return;
    }

    if (!dniPattern.test(employeeInput.dni)) {
        res.status(400).json({ message: "Ingresa un DNI valido de 8 digitos." });
        return;
    }

    if (!peruvianPhonePattern.test(employeeInput.celular)) {
        res.status(400).json({ message: "Ingresa un celular peruano valido de 9 digitos que empiece con 9." });
        return;
    }

    if (!emailPattern.test(employeeInput.email)) {
        res.status(400).json({ message: "Ingresa un correo electronico valido." });
        return;
    }

    if (employeeInput.contrasena.length < 8) {
        res.status(400).json({ message: "La contrasena temporal debe tener minimo 8 caracteres." });
        return;
    }

    if (!["empleado", "admin"].includes(normalizeText(employeeInput.rol))) {
        res.status(400).json({ message: "Selecciona un rol valido para el empleado." });
        return;
    }

    try {
        const { data: existingUsers, error: existingError } = await supabase
            .from(usersTable)
            .select("id,email,dni,celular")
            .or(`email.eq.${employeeInput.email},dni.eq.${employeeInput.dni},celular.eq.${employeeInput.celular}`);

        if (existingError) {
            throw existingError;
        }

        const existingUser = existingUsers?.[0];

        if (existingUser) {
            if (existingUser.email === employeeInput.email) {
                res.status(409).json({ message: "Ese correo ya esta registrado." });
                return;
            }

            if (existingUser.dni === employeeInput.dni) {
                res.status(409).json({ message: "Ese DNI ya esta registrado." });
                return;
            }

            if (existingUser.celular === employeeInput.celular) {
                res.status(409).json({ message: "Ese celular ya esta registrado." });
                return;
            }
        }

        const employeeToInsert = {
            nombre: employeeInput.nombre,
            dni: employeeInput.dni,
            celular: employeeInput.celular,
            email: employeeInput.email,
            [userPasswordColumn]: employeeInput.contrasena,
            rol: normalizeText(employeeInput.rol) === "admin" ? "Admin" : "Empleado"
        };

        const { data: createdEmployees, error: insertError } = await supabase
            .from(usersTable)
            .insert(employeeToInsert)
            .select("id,nombre,email,dni,celular,rol");

        if (insertError) {
            throw insertError;
        }

        res.status(201).json({ ok: true, empleado: createdEmployees?.[0] || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo guardar el empleado." });
    }
});

app.patch("/api/admin/empleados/:id", async (req, res) => {
    const employeeId = String(req.params.id || "").trim();
    const requesterEmail = String(req.body?.requesterEmail || "").trim().toLowerCase();
    const employeeInput = {
        nombre: String(req.body?.nombre || "").trim().replace(/\s+/g, " "),
        dni: String(req.body?.dni || "").replace(/\D/g, ""),
        celular: String(req.body?.celular || "").replace(/\D/g, ""),
        email: String(req.body?.email || "").trim().toLowerCase(),
        rol: String(req.body?.rol || "Empleado").trim()
    };
    const requesterIsMainAdmin = requesterEmail === "admin@chavala.com";
    const normalizedRole = normalizeText(employeeInput.rol);

    if (!employeeId) {
        res.status(400).json({ message: "No se encontro el empleado a modificar." });
        return;
    }

    if (!employeeInput.nombre || !employeeInput.dni || !employeeInput.celular || !employeeInput.email || !employeeInput.rol) {
        res.status(400).json({ message: "Completa todos los campos para guardar los cambios." });
        return;
    }

    if (!namePattern.test(employeeInput.nombre)) {
        res.status(400).json({ message: "El nombre solo puede tener letras y espacios." });
        return;
    }

    if (!dniPattern.test(employeeInput.dni)) {
        res.status(400).json({ message: "Ingresa un DNI valido de 8 digitos." });
        return;
    }

    if (!peruvianPhonePattern.test(employeeInput.celular)) {
        res.status(400).json({ message: "Ingresa un celular peruano valido de 9 digitos que empiece con 9." });
        return;
    }

    if (!emailPattern.test(employeeInput.email)) {
        res.status(400).json({ message: "Ingresa un correo electronico valido." });
        return;
    }

    if (!["empleado", "admin"].includes(normalizedRole)) {
        res.status(400).json({ message: "Selecciona un rol valido." });
        return;
    }

    if (!requesterIsMainAdmin && normalizedRole === "admin") {
        res.status(403).json({ message: "Solo el administrador principal puede asignar o modificar administradores." });
        return;
    }

    try {
        const { data: currentUsers, error: currentError } = await supabase
            .from(usersTable)
            .select("id,nombre,email,dni,celular,rol")
            .eq("id", employeeId)
            .limit(1);

        if (currentError) {
            throw currentError;
        }

        const currentUser = currentUsers?.[0];

        if (!currentUser) {
            res.status(404).json({ message: "No se encontro el empleado." });
            return;
        }

        const currentRole = normalizeText(getRoleFromRecord(currentUser));

        if (!requesterIsMainAdmin && currentRole === "admin") {
            res.status(403).json({ message: "Solo el administrador principal puede modificar administradores." });
            return;
        }

        const { data: existingUsers, error: existingError } = await supabase
            .from(usersTable)
            .select("id,email,dni,celular")
            .or(`email.eq.${employeeInput.email},dni.eq.${employeeInput.dni},celular.eq.${employeeInput.celular}`);

        if (existingError) {
            throw existingError;
        }

        const duplicatedUser = (existingUsers || []).find((user) => String(user.id) !== employeeId);

        if (duplicatedUser) {
            if (duplicatedUser.email === employeeInput.email) {
                res.status(409).json({ message: "Ese correo ya esta registrado." });
                return;
            }

            if (duplicatedUser.dni === employeeInput.dni) {
                res.status(409).json({ message: "Ese DNI ya esta registrado." });
                return;
            }

            if (duplicatedUser.celular === employeeInput.celular) {
                res.status(409).json({ message: "Ese celular ya esta registrado." });
                return;
            }
        }

        const employeeToUpdate = {
            nombre: employeeInput.nombre,
            dni: employeeInput.dni,
            celular: employeeInput.celular,
            email: employeeInput.email,
            rol: normalizedRole === "admin" ? "Admin" : "Empleado"
        };

        const { data: updatedEmployees, error: updateError } = await supabase
            .from(usersTable)
            .update(employeeToUpdate)
            .eq("id", employeeId)
            .select("id,nombre,email,dni,celular,rol");

        if (updateError) {
            throw updateError;
        }

        res.json({ ok: true, empleado: updatedEmployees?.[0] || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo actualizar el empleado." });
    }
});
app.get("/api/admin/proveedores", async (req, res) => {
    try {
        const { data: proveedores, error } = await supabase
            .from(providersTable)
            .select("id,nombre,ruc_dni,telefono,direccion,created_at")
            .order("nombre", { ascending: true })
            .limit(100);

        if (error) throw error;

        res.json({
            ok: true,
            proveedores: proveedores || []
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "No se pudieron cargar los proveedores."
        });
    }
});

app.post("/api/admin/proveedores", async (req, res) => {
    const providerInput = {
        nombre: String(req.body?.nombre || "").trim().replace(/\s+/g, " "),
        ruc_dni: String(req.body?.ruc_dni || req.body?.rucDni || "").replace(/\D/g, ""),
        telefono: String(req.body?.telefono || "").replace(/\D/g, ""),
        direccion: String(req.body?.direccion || "").trim().replace(/\s+/g, " ")
    };
    const providerNamePattern = /^[A-Za-z0-9\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1\s.,&()#\-]+$/;

    if (!providerInput.nombre || !providerInput.ruc_dni || !providerInput.telefono || !providerInput.direccion) {
        res.status(400).json({ message: "Completa todos los campos para guardar al proveedor." });
        return;
    }

    if (!providerNamePattern.test(providerInput.nombre)) {
        res.status(400).json({ message: "El nombre del proveedor tiene caracteres no validos." });
        return;
    }

    if (!/^(?:\d{8}|\d{11})$/.test(providerInput.ruc_dni)) {
        res.status(400).json({ message: "Ingresa un DNI de 8 digitos o RUC de 11 digitos." });
        return;
    }

    if (!peruvianPhonePattern.test(providerInput.telefono)) {
        res.status(400).json({ message: "Ingresa un telefono peruano valido de 9 digitos que empiece con 9." });
        return;
    }

    if (providerInput.direccion.length < 5) {
        res.status(400).json({ message: "Ingresa una direccion valida para el proveedor." });
        return;
    }

    try {
        const { data: existingProviders, error: existingError } = await supabase
            .from(providersTable)
            .select("id,ruc_dni,telefono")
            .or(`ruc_dni.eq.${providerInput.ruc_dni},telefono.eq.${providerInput.telefono}`);

        if (existingError) {
            throw existingError;
        }

        const existingProvider = existingProviders?.[0];

        if (existingProvider) {
            if (existingProvider.ruc_dni === providerInput.ruc_dni) {
                res.status(409).json({ message: "Ese DNI o RUC ya esta registrado." });
                return;
            }

            if (existingProvider.telefono === providerInput.telefono) {
                res.status(409).json({ message: "Ese telefono ya esta registrado." });
                return;
            }
        }

        const { data: createdProviders, error: insertError } = await supabase
            .from(providersTable)
            .insert(providerInput)
            .select("id,nombre,ruc_dni,telefono,direccion,created_at");

        if (insertError) {
            throw insertError;
        }

        res.status(201).json({ ok: true, proveedor: createdProviders?.[0] || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo guardar el proveedor." });
    }
});

app.get("/api/usuarios/perfil", async (req, res) => {
    const id = String(req.query?.id || "").trim();
    const email = String(req.query?.email || "").trim().toLowerCase();

    if (!id && !email) {
        res.status(400).json({ message: "No se pudo identificar al usuario." });
        return;
    }

    try {
        let query = supabase.from(usersTable).select("id,nombre,email,dni,celular,rol");

        query = id ? query.eq("id", id) : query.eq("email", email);

        const { data: user, error } = await query.maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            res.status(404).json({ message: "No se encontro el perfil." });
            return;
        }

        res.json({ ok: true, user: getPublicUser(user) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo cargar el perfil." });
    }
});

app.patch("/api/usuarios/perfil", async (req, res) => {
    const profile = getCleanProfileInput(req.body);
    const validationMessage = validateProfileInput(profile);

    if (!profile.id && !profile.currentEmail) {
        res.status(400).json({ message: "No se pudo identificar al usuario." });
        return;
    }

    if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
    }

    try {
        if (profile.email !== profile.currentEmail) {
            const { data: existingUser, error: existingError } = await supabase
                .from(usersTable)
                .select("id,email")
                .eq("email", profile.email)
                .maybeSingle();

            if (existingError) {
                throw existingError;
            }

            if (existingUser && existingUser.id !== profile.id) {
                res.status(409).json({ message: "Ese correo ya esta registrado." });
                return;
            }
        }

        let query = supabase
            .from(usersTable)
            .update({
                nombre: profile.nombre,
                email: profile.email,
                celular: profile.celular
            })
            .select("id,nombre,email,dni,celular,rol");

        query = profile.id ? query.eq("id", profile.id) : query.eq("email", profile.currentEmail);

        const { data: updatedUsers, error } = await query;

        if (error) {
            throw error;
        }

        const updatedUser = updatedUsers?.[0];

        if (!updatedUser) {
            res.status(404).json({ message: "No se encontro el perfil para actualizar." });
            return;
        }

        res.json({ ok: true, user: getPublicUser(updatedUser) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo guardar el perfil." });
    }
});

app.patch("/api/usuarios/password", async (req, res) => {
    const passwordInput = getCleanPasswordInput(req.body);
    const validationMessage = validatePasswordInput(passwordInput);

    if (!passwordInput.id && !passwordInput.currentEmail) {
        res.status(400).json({ message: "No se pudo identificar al usuario." });
        return;
    }

    if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
    }

    try {
        let userQuery = supabase
            .from(usersTable)
            .select(`id,email,${userPasswordColumn}`);

        userQuery = passwordInput.id ? userQuery.eq("id", passwordInput.id) : userQuery.eq("email", passwordInput.currentEmail);

        const { data: user, error: userError } = await userQuery.maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            res.status(404).json({ message: "No se encontro el usuario." });
            return;
        }

        if (String(user[userPasswordColumn] || "") !== passwordInput.currentPassword) {
            res.status(401).json({ message: "La contrasena actual no es correcta." });
            return;
        }

        let updateQuery = supabase
            .from(usersTable)
            .update({ [userPasswordColumn]: passwordInput.newPassword })
            .select("id");

        updateQuery = passwordInput.id ? updateQuery.eq("id", passwordInput.id) : updateQuery.eq("email", passwordInput.currentEmail);

        const { data: updatedUsers, error: updateError } = await updateQuery;

        if (updateError) {
            throw updateError;
        }

        if (!updatedUsers?.[0]) {
            res.status(404).json({ message: "No se pudo actualizar la contrasena." });
            return;
        }

        res.json({ ok: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo actualizar la contrasena." });
    }
});

app.post("/api/auth/register", async (req, res) => {
    const registerInput = getCleanRegisterInput(req.body);
    const validationMessage = validateRegisterInput(registerInput);

    if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
    }

    try {
        const { data: existingUsers, error: existingError } = await supabase
            .from(usersTable)
            .select("id,email,dni,celular")
            .or(`email.eq.${registerInput.email},dni.eq.${registerInput.dni},celular.eq.${registerInput.celular}`);

        if (existingError) {
            throw existingError;
        }

        const existingUser = existingUsers?.[0];

        if (existingUser) {
            if (existingUser.email === registerInput.email) {
                res.status(409).json({ message: "Ese correo ya esta registrado." });
                return;
            }

            if (existingUser.dni === registerInput.dni) {
                res.status(409).json({ message: "Ese DNI ya esta registrado." });
                return;
            }

            if (existingUser.celular === registerInput.celular) {
                res.status(409).json({ message: "Ese celular ya esta registrado." });
                return;
            }
        }

        const userToInsert = {
            nombre: registerInput.nombre,
            email: registerInput.email,
            [userPasswordColumn]: registerInput.contrasena,
            dni: registerInput.dni,
            celular: registerInput.celular,
            rol: customerRole
        };

        let { data: createdUsers, error: insertError } = await supabase
            .from(usersTable)
            .insert(userToInsert)
            .select("id,nombre,email,dni,celular,rol");

        if (insertError && customerRole !== "Cliente" && /cliente|user_role|invalid input value/i.test(insertError.message || "")) {
            const retryUser = {
                ...userToInsert,
                rol: "Cliente"
            };

            const retryResult = await supabase
                .from(usersTable)
                .insert(retryUser)
                .select("id,nombre,email,dni,celular,rol");

            createdUsers = retryResult.data;
            insertError = retryResult.error;
        }

        if (insertError) {
            throw insertError;
        }

        const createdUser = createdUsers?.[0];

        if (!createdUser) {
            res.status(500).json({ message: "No se pudo crear la cuenta." });
            return;
        }

        res.status(201).json({
            ok: true,
            message: "Cuenta creada correctamente.",
            redirectUrl: "/assets/pages/login/",
            user: getPublicUser(createdUser)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo crear la cuenta. Intentalo de nuevo." });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !password) {
        res.status(400).json({ message: "Ingresa tu correo y contrasena." });
        return;
    }

    try {
        const tableLogin = await loginWithUsersTable(email, password);

        if (tableLogin.checked) {
            if (!tableLogin.ok) {
                res.status(401).json({ message: "Correo o contrasena incorrectos." });
                return;
            }

            if (!allowedRoles.has(normalizeRole(tableLogin.role))) {
                res.status(403).json({
                    message: "Tu cuenta inicio sesion, pero no tiene un rol permitido."
                });
                return;
            }

            res.json({
                ok: true,
                redirectUrl: getRedirectByRole(tableLogin.role),
                user: {
                    id: tableLogin.user.id,
                    nombre: getNameFromRecord(tableLogin.user),
                    email: tableLogin.user.email,
                    celular: tableLogin.user.celular || "",
                    rango: tableLogin.role,
                    rol: tableLogin.role
                }
            });
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            res.status(401).json({ message: "Correo o contrasena incorrectos." });
            return;
        }

        const role = await getUserProfileRole(data.session, data.user);

        if (!allowedRoles.has(normalizeRole(role))) {
            res.status(403).json({
                message: "Tu cuenta inicio sesion, pero no tiene un rol permitido."
            });
            return;
        }

        res.json({
            ok: true,
            redirectUrl: getRedirectByRole(role),
            user: {
                id: data.user.id,
                nombre: getNameFromMetadata(data.user),
                email: data.user.email,
                celular: "",
                rango: role,
                rol: role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo iniciar sesion. Intentalo de nuevo." });
    }
});

app.listen(port, () => {
    console.log("Supabase configurado");
    console.log(`API corriendo en http://localhost:${port}`);
});
