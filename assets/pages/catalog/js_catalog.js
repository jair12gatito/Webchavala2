const catalogGrid = document.querySelector("#catalogGrid");
const catalogFilters = document.querySelectorAll(".catalog-filter");
const fallbackCardsHtml = catalogGrid?.innerHTML || "";

let activeCatalogFilter = "all";

const whatsappNumber = "51934344116";

const descriptionByName = [
    {
        match: ["arandano", "arándano"],
        text: "Bizcocho suave con arándanos, crema ligera y un sabor frutal que se siente fresco en cada porción."
    },
    {
        match: ["frutos del bosque"],
        text: "Capas suaves con frutos rojos, crema delicada y un equilibrio rico entre dulce y ácido."
    },
    {
        match: ["tres leches"],
        text: "Húmedo, cremoso y bien casero, preparado para quienes aman un postre dulce sin complicarse."
    },
    {
        match: ["moka"],
        text: "Crema de café, bizcocho tierno y un acabado suave para un sabor elegante y nada empalagoso."
    },
    {
        match: ["selva negra"],
        text: "Chocolate, crema y cerezas en una combinación clásica, intensa y perfecta para compartir."
    },
    {
        match: ["fresa"],
        text: "Cheesecake cremoso con cubierta de fresa, ideal para un antojo fresco y dulce."
    },
    {
        match: ["lucuma", "lúcuma"],
        text: "Cheesecake de lúcuma con textura suave y sabor peruano bien marcado."
    },
    {
        match: ["platano", "plátano"],
        text: "Cheesecake suave con notas de plátano, preparado para disfrutar bien frío."
    },
    {
        match: ["tartaleta"],
        text: "Bocaditos pequeños con base crocante y relleno dulce, perfectos para compartir."
    },
    {
        match: ["turron", "turrón"],
        text: "Turrón dulce y tradicional, preparado para acompañar la mesa familiar."
    }
];

const normalizeText = (value) => {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

const escapeHtml = (value) => {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
};

const formatPrice = (price) => {
    if (price === undefined || price === null || price === "") {
        return "Consultar";
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice)) {
        return String(price).startsWith("S/") ? price : `S/ ${price}`;
    }

    return `S/ ${numericPrice}`;
};

const getProductDescription = (product) => {
    if (product.descripcion) {
        return product.descripcion;
    }

    const normalizedName = normalizeText(product.nombre);
    const description = descriptionByName.find((item) => {
        return item.match.some((word) => normalizedName.includes(normalizeText(word)));
    });

    return description?.text || "Preparado artesanalmente en Chavala con ingredientes frescos y mucho cuidado en cada detalle.";
};

const getProductCategories = (product) => {
    const rawCategories = product.categorias || product.categoria || product.categories || product.category;
    const categories = Array.isArray(rawCategories)
        ? rawCategories
        : String(rawCategories || "").split(/[,\s]+/);

    const normalizedName = normalizeText(product.nombre);
    const inferredCategories = ["pasteles"];

    if (["arandano", "frutos", "fresa", "lucuma", "platano"].some((word) => normalizedName.includes(word))) {
        inferredCategories.push("frutales");
    }

    if (["tres leches", "moka", "selva negra", "turron"].some((word) => normalizedName.includes(word))) {
        inferredCategories.push("clasicos");
    }

    if (
        product.favorito ||
        product.destacado ||
        ["frutos del bosque", "tres leches", "selva negra", "fresa"].some((word) => normalizedName.includes(word))
    ) {
        inferredCategories.push("favoritos");
    }

    return [...new Set([...categories, ...inferredCategories].map(normalizeText).filter(Boolean))];
};

const getProductBadge = (product) => {
    if (product.etiqueta || product.badge) {
        return product.etiqueta || product.badge;
    }

    const normalizedName = normalizeText(product.nombre);

    if (normalizedName.includes("tres leches")) {
        return "Clásico";
    }

    if (normalizedName.includes("selva negra")) {
        return "Especial";
    }

    return "";
};

const createProductCard = (product) => {
    const name = product.nombre || product.name || "Producto Chavala";
    const image = product.imagen_url || product.image_url || product.imagen || product.image || product.imageUrl || "/assets/img/ic_icon.svg";
    const description = getProductDescription(product);
    const price = formatPrice(product.precio ?? product.price);
    const categories = getProductCategories(product).join(" ");
    const badge = getProductBadge(product);
    const whatsappText = encodeURIComponent(`Hola, quiero consultar por ${name}.`);

    return `
        <article class="catalog-card" data-category="${escapeHtml(categories)}">
            <div class="catalog-card__media">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}">
                ${badge ? `<span class="catalog-card__badge">${escapeHtml(badge)}</span>` : ""}
            </div>
            <div class="catalog-card__body">
                <h2>${escapeHtml(name)}</h2>
                <p>${escapeHtml(description)}</p>
                <div class="catalog-card__bottom">
                    <strong>${escapeHtml(price)}</strong>
                    <a class="catalog-card__order" href="https://wa.me/${whatsappNumber}?text=${whatsappText}" target="_blank" rel="noopener noreferrer" aria-label="Pedir ${escapeHtml(name)}">+</a>
                </div>
            </div>
        </article>
    `;
};

const applyCatalogFilter = () => {
    const catalogCards = document.querySelectorAll(".catalog-card");

    catalogCards.forEach((card) => {
        const categories = card.dataset.category?.split(" ") || [];
        const shouldShow = activeCatalogFilter === "all" || categories.includes(activeCatalogFilter);

        card.classList.toggle("is-hidden", !shouldShow);
    });
};

catalogFilters.forEach((filterButton) => {
    filterButton.addEventListener("click", () => {
        activeCatalogFilter = filterButton.dataset.filter;

        catalogFilters.forEach((button) => {
            const isActive = button === filterButton;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        applyCatalogFilter();
    });
});

const loadCatalogProducts = async () => {
    if (!catalogGrid) {
        return;
    }

    const apiUrl = catalogGrid.dataset.apiUrl;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error("No se pudo cargar el catalogo desde Supabase");
        }

        const products = await response.json();

        if (!Array.isArray(products) || products.length === 0) {
            return;
        }

        catalogGrid.innerHTML = products.map(createProductCard).join("");
        applyCatalogFilter();
    } catch (error) {
        console.error(error);
        catalogGrid.innerHTML = fallbackCardsHtml;
        applyCatalogFilter();
    }
};

loadCatalogProducts();
