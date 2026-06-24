const path = require("path");
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "chavala";
const productsCollection = process.env.MONGODB_PRODUCTS_COLLECTION || "productos";
const publicRoot = path.join(__dirname, "..");
const catalogPath = path.join(publicRoot, "assets", "pages", "catalog", "catalog.html");

if (!mongoUri) {
    console.error("Falta MONGODB_URI en el archivo .env");
    process.exit(1);
}

const client = new MongoClient(mongoUri);

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
    res.json({ ok: true, service: "Chavala API" });
});

app.get("/api/productos", async (req, res) => {
    try {
        const productos = await client
            .db(dbName)
            .collection(productsCollection)
            .find({})
            .sort({ nombre: 1 })
            .toArray();

        res.json(productos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudieron obtener los productos" });
    }
});

async function startServer() {
    try {
        await client.connect();
        console.log("MongoDB conectado");

        app.listen(port, () => {
            console.log(`API corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error("No se pudo conectar a MongoDB");
        console.error(error);
        process.exit(1);
    }
}

startServer();
