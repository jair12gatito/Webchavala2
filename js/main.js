const includePartials = async () => {
    const placeholders = document.querySelectorAll("[data-include]");

    await Promise.all([...placeholders].map(async (placeholder) => {
        const partialPath = placeholder.dataset.include;

        try {
            const response = await fetch(partialPath);

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

includePartials();

const locationButtons = document.querySelectorAll(".visit__location-button[data-map-src]");
const locationMap = document.querySelector(".visit__map iframe");
const scrollButtons = document.querySelectorAll("[data-scroll-target]");

if (location.hash === "#nosotros") {
    history.replaceState(null, "", location.pathname + location.search);
}

scrollButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.scrollTarget);

        if (!target) {
            return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
