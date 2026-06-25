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
const userPasswordColumn = process.env.SUPABASE_USER_PASSWORD_COLUMN || "contrasena";
const profilesTables = (process.env.SUPABASE_PROFILES_TABLES || process.env.SUPABASE_PROFILES_TABLE || "usuarios,perfiles,profiles")
    .split(",")
    .map((table) => table.trim())
    .filter(Boolean);
const userRole = "usuario";
const publicRoot = path.join(__dirname, "..");
const catalogPath = path.join(publicRoot, "assets", "pages", "catalog", "catalog.html");
const catalogUrl = "/assets/pages/catalog/catalog.html";

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

const getRoleFromMetadata = (user) => {
    return getRoleFromRecord(user?.user_metadata) || getRoleFromRecord(user?.app_metadata);
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

            if (normalizeRole(tableLogin.role) !== userRole) {
                res.status(403).json({
                    message: "Tu cuenta inicio sesion, pero no tiene rango usuario."
                });
                return;
            }

            res.json({
                ok: true,
                redirectUrl: catalogUrl,
                user: {
                    email: tableLogin.user.email,
                    rango: tableLogin.role
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

        if (normalizeRole(role) !== userRole) {
            res.status(403).json({
                message: "Tu cuenta inicio sesion, pero no tiene rango usuario."
            });
            return;
        }

        res.json({
            ok: true,
            redirectUrl: catalogUrl,
            user: {
                email: data.user.email,
                rango: role
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
