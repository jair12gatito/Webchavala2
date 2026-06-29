const catalogGrid = document.querySelector("#catalogGrid");
const catalogFilters = document.querySelectorAll(".catalog-filter");
const catalogCart = document.querySelector("[data-catalog-cart]");
const cartToggle = document.querySelector("[data-cart-toggle]");
const cartPanel = document.querySelector("[data-cart-panel]");
const cartClose = document.querySelector("[data-cart-close]");
const cartCount = document.querySelector("[data-cart-count]");
const cartItems = document.querySelector("[data-cart-items]");
const cartEmpty = document.querySelector("[data-cart-empty]");
const cartStatus = document.querySelector("[data-cart-status]");
const cartTotal = document.querySelector("[data-cart-total]");
const cartCheckout = document.querySelector("[data-cart-checkout]");
const orderApiUrl = "https://webchavala2-3xja.onrender.com/api/pedidos";
const orderModal = document.querySelector("[data-order-modal]");
const orderModalItems = document.querySelector("[data-order-modal-items]");
const orderModalTotal = document.querySelector("[data-order-modal-total]");
const orderModalStatus = document.querySelector("[data-order-modal-status]");
const orderCancel = document.querySelector("[data-order-cancel]");
const orderConfirm = document.querySelector("[data-order-confirm]");
const fallbackCardsHtml = catalogGrid?.innerHTML || "";

let activeCatalogFilter = "all";
let catalogProductsById = new Map();
let catalogCartItems = [];

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

const getPriceNumber = (price) => {
    if (price === undefined || price === null || price === "") {
        return 0;
    }

    const number = Number(String(price).replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? number : 0;
};

const formatStock = (stock) => {
    if (stock === null || stock === undefined || stock === "") {
        return "Stock: --";
    }

    const numericStock = Number(stock);

    if (!Number.isFinite(numericStock)) {
        return "Stock: --";
    }

    return `Stock: ${Math.max(0, Math.floor(numericStock))}`;
};

const getProductStock = (product) => {
    const stock = product.stock ?? product.cantidad ?? product.inventario ?? product.disponibles;

    if (stock === undefined || stock === null || stock === "") {
        return null;
    }

    const numericStock = Number(stock);
    return Number.isFinite(numericStock) ? Math.max(0, Math.floor(numericStock)) : null;
};

const getProductId = (product) => {
    const id = product.id ?? product.producto_id ?? product.codigo ?? product.sku ?? product.nombre ?? product.name;
    return normalizeText(id).replace(/\s+/g, "-") || `producto-${Math.random().toString(36).slice(2)}`;
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
    const id = getProductId(product);
    const name = product.nombre || product.name || "Producto Chavala";
    const image = product.imagen_url || product.image_url || product.imagen || product.image || product.imageUrl || "/assets/img/ic_icon.svg";
    const description = getProductDescription(product);
    const rawPrice = product.precio ?? product.price;
    const price = formatPrice(rawPrice);
    const priceNumber = getPriceNumber(rawPrice);
    const categories = getProductCategories(product).join(" ");
    const badge = getProductBadge(product);
    const stock = getProductStock(product);
    const isOutOfStock = stock !== null && stock <= 0;

    catalogProductsById.set(id, {
        id,
        name,
        image,
        price,
        priceNumber,
        stock
    });

    return `
        <article class="catalog-card" data-category="${escapeHtml(categories)}" data-product-id="${escapeHtml(id)}">
            <div class="catalog-card__media">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}">
                ${badge ? `<span class="catalog-card__badge">${escapeHtml(badge)}</span>` : ""}
            </div>
            <div class="catalog-card__body">
                <h2>${escapeHtml(name)}</h2>
                <p>${escapeHtml(description)}</p>
                <span class="catalog-card__stock${isOutOfStock ? " is-empty" : ""}">${escapeHtml(formatStock(stock))}</span>
                <div class="catalog-card__bottom">
                    <strong>${escapeHtml(price)}</strong>
                    <button class="catalog-card__order" type="button" data-add-to-cart="${escapeHtml(id)}" ${isOutOfStock ? "disabled" : ""} aria-label="Agregar ${escapeHtml(name)} al carrito">+</button>
                </div>
            </div>
        </article>
    `;
};

const getCatalogStoredUser = () => {
    const storedUser = localStorage.getItem("chavalaUser") || sessionStorage.getItem("chavalaUser");

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch (error) {
        localStorage.removeItem("chavalaUser");
        sessionStorage.removeItem("chavalaUser");
        localStorage.removeItem("chavalaLastActivity");
        sessionStorage.removeItem("chavalaLastActivity");
        localStorage.removeItem("chavalaExpiresAt");
        sessionStorage.removeItem("chavalaExpiresAt");
        return null;
    }
};

const getCatalogUserRole = (user) => {
    return normalizeText(user?.rol || user?.rango);
};

const isCatalogClientLogged = () => {
    const role = getCatalogUserRole(getCatalogStoredUser());
    return role === "cliente" || role === "usuario";
};

const getCatalogCartKey = () => {
    const user = getCatalogStoredUser();
    const userKey = user?.id || user?.email || "anonimo";
    return `chavalaCart:${userKey}`;
};

const setCartStatus = (message, type = "error") => {
    if (!cartStatus) {
        return;
    }

    cartStatus.textContent = message;
    cartStatus.dataset.type = type;

    if (message) {
        window.clearTimeout(setCartStatus.timer);
        setCartStatus.timer = window.setTimeout(() => {
            cartStatus.textContent = "";
        }, 2400);
    }
};

const saveCart = () => {
    localStorage.setItem(getCatalogCartKey(), JSON.stringify(catalogCartItems));
};

const loadCart = () => {
    const storedCart = localStorage.getItem(getCatalogCartKey());

    if (!storedCart) {
        catalogCartItems = [];
        return;
    }

    try {
        catalogCartItems = JSON.parse(storedCart).filter((item) => item && item.id && item.quantity > 0);
    } catch (error) {
        catalogCartItems = [];
    }
};

const openCart = () => {
    if (!cartPanel || !cartToggle) {
        return;
    }

    cartPanel.hidden = false;
    catalogCart?.classList.add("is-open");
    cartToggle.setAttribute("aria-expanded", "true");
};

const closeCart = () => {
    if (!cartPanel || !cartToggle) {
        return;
    }

    cartPanel.hidden = true;
    catalogCart?.classList.remove("is-open");
    cartToggle.setAttribute("aria-expanded", "false");
};

const getCartItemQuantity = (productId) => {
    return catalogCartItems.find((item) => item.id === productId)?.quantity || 0;
};

const syncProductButtons = () => {
    document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
        const product = catalogProductsById.get(button.dataset.addToCart);

        if (!product) {
            return;
        }

        const quantity = getCartItemQuantity(product.id);
        const reachedStock = product.stock !== null && quantity >= product.stock;
        const isOutOfStock = product.stock !== null && product.stock <= 0;

        button.disabled = isOutOfStock || reachedStock;
        button.textContent = reachedStock && !isOutOfStock ? "✓" : "+";
        button.title = isOutOfStock ? "Sin stock disponible" : reachedStock ? "Stock maximo agregado" : "Agregar al carrito";
    });
};

const renderCart = () => {
    if (!catalogCart || !cartItems || !cartCount || !cartEmpty || !cartTotal) {
        return;
    }

    const totalItems = catalogCartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = catalogCartItems.reduce((sum, item) => sum + (item.priceNumber * item.quantity), 0);

    cartCount.textContent = String(totalItems);
    cartEmpty.hidden = catalogCartItems.length > 0;
    cartItems.innerHTML = "";

    catalogCartItems.forEach((item) => {
        const product = catalogProductsById.get(item.id) || item;
        const maxStock = product.stock;
        const itemElement = document.createElement("article");
        itemElement.className = "catalog-cart__item";
        itemElement.innerHTML = `
            <img src="${escapeHtml(product.image || item.image || "/assets/img/ic_icon.svg")}" alt="${escapeHtml(product.name || item.name)}">
            <div class="catalog-cart__item-info">
                <h3>${escapeHtml(product.name || item.name)}</h3>
                <span>${escapeHtml(product.price || item.price || `S/ ${item.priceNumber}`)}</span>
                <small>${maxStock === null || maxStock === undefined ? "Stock por confirmar" : `Stock: ${maxStock}`}</small>
            </div>
            <div class="catalog-cart__qty">
                <button type="button" data-cart-decrease="${escapeHtml(item.id)}" aria-label="Quitar unidad">-</button>
                <strong>${item.quantity}</strong>
                <button type="button" data-cart-increase="${escapeHtml(item.id)}" ${maxStock !== null && maxStock !== undefined && item.quantity >= maxStock ? "disabled" : ""} aria-label="Agregar unidad">+</button>
            </div>
        `;
        cartItems.appendChild(itemElement);
    });

    cartTotal.textContent = `S/ ${totalPrice.toFixed(2).replace(".00", "")}`;
    syncProductButtons();
};

const getCartTotalValue = () => {
    return catalogCartItems.reduce((sum, item) => sum + (item.priceNumber * item.quantity), 0);
};

const setOrderStatus = (message, type = "error") => {
    if (!orderModalStatus) {
        return;
    }

    orderModalStatus.textContent = message;
    orderModalStatus.dataset.type = type;
};

const setOrderLoading = (isLoading) => {
    if (!orderConfirm || !orderCancel) {
        return;
    }

    orderConfirm.disabled = isLoading;
    orderCancel.disabled = isLoading;
    orderConfirm.textContent = isLoading ? "Generando..." : "S\u00ed, generar pedido";
};

const renderOrderModal = () => {
    if (!orderModalItems || !orderModalTotal) {
        return;
    }

    orderModalItems.innerHTML = catalogCartItems.map((item) => {
        const product = catalogProductsById.get(item.id) || item;
        const name = product.name || item.name || "Producto";
        const priceNumber = Number(product.priceNumber ?? item.priceNumber ?? 0);
        const subtotal = priceNumber * item.quantity;

        return `
            <article class="catalog-order-modal__item">
                <div>
                    <strong>${escapeHtml(name)}</strong>
                    <span>${item.quantity} unidad${item.quantity === 1 ? "" : "es"} x ${escapeHtml(product.price || item.price || `S/ ${priceNumber}`)}</span>
                </div>
                <em>S/ ${subtotal.toFixed(2).replace(".00", "")}</em>
            </article>
        `;
    }).join("");

    orderModalTotal.textContent = `S/ ${getCartTotalValue().toFixed(2).replace(".00", "")}`;
};

const openOrderModal = () => {
    if (!orderModal || !catalogCartItems.length) {
        return;
    }

    renderOrderModal();
    setOrderStatus("");
    orderModal.hidden = false;
    document.body.style.overflow = "hidden";
    orderConfirm?.focus();
};

const closeOrderModal = () => {
    if (!orderModal) {
        return;
    }

    orderModal.hidden = true;
    document.body.style.overflow = "";
    setOrderLoading(false);
};

const createOrderPayload = () => {
    const user = getCatalogStoredUser();

    return {
        cliente: {
            id: user?.id || "",
            nombre: user?.nombre || user?.name || "",
            email: user?.email || "",
            celular: user?.celular || ""
        },
        productos: catalogCartItems.map((item) => {
            const product = catalogProductsById.get(item.id) || item;

            return {
                id: item.id,
                nombre: product.name || item.name || "Producto",
                cantidad: item.quantity,
                precio: Number(product.priceNumber ?? item.priceNumber ?? 0)
            };
        })
    };
};

const submitOrder = async () => {
    if (!catalogCartItems.length) {
        setOrderStatus("Agrega productos antes de generar el pedido.");
        return;
    }

    setOrderLoading(true);
    setOrderStatus("");

    try {
        const response = await fetch(orderApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(createOrderPayload())
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "No se pudo generar el pedido.");
        }

        catalogCartItems = [];
        saveCart();
        await loadCatalogProducts();
        renderCart();
        closeOrderModal();
        openCart();
        setCartStatus(`Pedido ${payload.pedido?.codigo ? `#${payload.pedido.codigo} ` : ""}generado correctamente.`, "success");
    } catch (error) {
        setOrderStatus(error.message || "No se pudo generar el pedido.");
    } finally {
        setOrderLoading(false);
    }
};

const initializeCatalogCart = () => {
    if (!catalogCart) {
        return;
    }

    if (!isCatalogClientLogged()) {
        catalogCart.hidden = true;
        return;
    }

    catalogCart.hidden = false;
    loadCart();
    renderCart();
};

const addToCart = (productId) => {
    if (!isCatalogClientLogged()) {
        setCartStatus("Inicia sesion como cliente para agregar productos.");
        window.location.href = "/assets/pages/login/";
        return;
    }

    const product = catalogProductsById.get(productId);

    if (!product) {
        return;
    }

    if (product.stock !== null && product.stock <= 0) {
        setCartStatus("Este producto no tiene stock disponible.");
        return;
    }

    const existingItem = catalogCartItems.find((item) => item.id === productId);

    if (existingItem) {
        if (product.stock !== null && existingItem.quantity >= product.stock) {
            setCartStatus("Ya agregaste todo el stock disponible.");
            openCart();
            return;
        }

        existingItem.quantity += 1;
    } else {
        catalogCartItems.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    renderCart();
    setCartStatus(`${product.name} agregado al carrito.`, "success");
    openCart();
};

const updateCartQuantity = (productId, delta) => {
    const item = catalogCartItems.find((cartItem) => cartItem.id === productId);
    const product = catalogProductsById.get(productId) || item;

    if (!item || !product) {
        return;
    }

    const nextQuantity = item.quantity + delta;

    if (nextQuantity <= 0) {
        catalogCartItems = catalogCartItems.filter((cartItem) => cartItem.id !== productId);
    } else if (product.stock !== null && product.stock !== undefined && nextQuantity > product.stock) {
        setCartStatus("No puedes superar el stock disponible.");
        return;
    } else {
        item.quantity = nextQuantity;
    }

    saveCart();
    renderCart();
};

const applyCatalogFilter = () => {
    const catalogCards = document.querySelectorAll(".catalog-card");

    catalogCards.forEach((card) => {
        const categories = card.dataset.category?.split(" ") || [];
        const shouldShow = activeCatalogFilter === "all" || categories.includes(activeCatalogFilter);

        card.classList.toggle("is-hidden", !shouldShow);
    });
};

const hydrateFallbackCards = () => {
    catalogProductsById = new Map();

    document.querySelectorAll(".catalog-card").forEach((card, index) => {
        const name = card.querySelector("h2")?.textContent?.trim() || `Producto ${index + 1}`;
        const image = card.querySelector("img")?.src || "/assets/img/ic_icon.svg";
        const priceText = card.querySelector(".catalog-card__bottom strong")?.textContent?.trim() || "Consultar";
        const id = normalizeText(name).replace(/\s+/g, "-") || `producto-${index + 1}`;
        const product = {
            id,
            name,
            image,
            price: priceText,
            priceNumber: getPriceNumber(priceText),
            stock: null
        };
        const bottom = card.querySelector(".catalog-card__bottom");
        const oldAction = card.querySelector(".catalog-card__order");

        catalogProductsById.set(id, product);
        card.dataset.productId = id;

        if (!card.querySelector(".catalog-card__stock")) {
            const stockLabel = document.createElement("span");
            stockLabel.className = "catalog-card__stock";
            stockLabel.textContent = formatStock(null);
            bottom?.before(stockLabel);
        }

        if (oldAction) {
            const button = document.createElement("button");
            button.className = "catalog-card__order";
            button.type = "button";
            button.dataset.addToCart = id;
            button.setAttribute("aria-label", `Agregar ${name} al carrito`);
            button.textContent = "+";
            oldAction.replaceWith(button);
        }
    });

    initializeCatalogCart();
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
        initializeCatalogCart();
    } catch (error) {
        console.error(error);
        catalogGrid.innerHTML = fallbackCardsHtml;
        hydrateFallbackCards();
        applyCatalogFilter();
    }
};

catalogGrid?.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");

    if (!addButton) {
        return;
    }

    addToCart(addButton.dataset.addToCart);
});

cartToggle?.addEventListener("click", () => {
    if (cartPanel?.hidden) {
        openCart();
    } else {
        closeCart();
    }
});

cartClose?.addEventListener("click", closeCart);

cartItems?.addEventListener("click", (event) => {
    const increaseButton = event.target.closest("[data-cart-increase]");
    const decreaseButton = event.target.closest("[data-cart-decrease]");

    if (increaseButton) {
        updateCartQuantity(increaseButton.dataset.cartIncrease, 1);
        return;
    }

    if (decreaseButton) {
        updateCartQuantity(decreaseButton.dataset.cartDecrease, -1);
    }
});

cartCheckout?.addEventListener("click", () => {
    if (!catalogCartItems.length) {
        setCartStatus("Agrega productos antes de continuar.");
        return;
    }

    openOrderModal();
});

orderCancel?.addEventListener("click", closeOrderModal);
orderConfirm?.addEventListener("click", submitOrder);

orderModal?.addEventListener("click", (event) => {
    if (event.target === orderModal) {
        closeOrderModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && orderModal && !orderModal.hidden) {
        closeOrderModal();
    }
});

loadCatalogProducts();
