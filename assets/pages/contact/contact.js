(function () {
    const trackingForm = document.querySelector("[data-tracking-form]");
    const trackingInput = document.getElementById("trackingCode");
    const trackingMessage = document.querySelector("[data-tracking-message]");
    const trackingSteps = document.querySelector("[data-tracking-steps]");
    const loadingLayer = document.querySelector("[data-contact-loading]");
    const contactForm = document.querySelector("[data-contact-form]");
    const formStatus = document.querySelector("[data-form-status]");
    const subjectSelect = contactForm?.querySelector('select[name="asunto"]');
    const otherSubjectField = document.querySelector("[data-other-subject-field]");
    const otherSubjectInput = contactForm?.querySelector('input[name="otroAsunto"]');
    const trackingApiUrl = "http://localhost:3000/api/pedidos/seguimiento";
    const contactEmail = "ContactoChavala@chavala.com";

    const setTrackingState = (state = "") => {
        if (!trackingSteps) {
            return;
        }

        if (state) {
            trackingSteps.dataset.state = state;
            return;
        }

        delete trackingSteps.dataset.state;
    };

    const toggleOtherSubject = () => {
        if (!subjectSelect || !otherSubjectField || !otherSubjectInput) {
            return;
        }

        const isOther = subjectSelect.value === "Otro";
        otherSubjectField.hidden = !isOther;
        otherSubjectInput.required = isOther;

        if (!isOther) {
            otherSubjectInput.value = "";
        }
    };

    subjectSelect?.addEventListener("change", toggleOtherSubject);
    toggleOtherSubject();

    const setMessage = (message, type = "") => {
        if (!trackingMessage) {
            return;
        }

        trackingMessage.textContent = message;
        trackingMessage.className = `tracking-result${type ? ` is-${type}` : ""}`;
    };

    const setLoading = (isLoading) => {
        if (!loadingLayer) {
            return;
        }

        loadingLayer.hidden = !isLoading;
    };

    const waitForLoading = () => {
        return new Promise((resolve) => {
            window.setTimeout(resolve, 850);
        });
    };

    const normalizeTrackingStatus = (status = "") => {
        const cleanStatus = String(status || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        if (/rechaz|cancel|anulad/.test(cleanStatus)) {
            return "rechazado";
        }

        if (/list|ready|recojo|recoger|complet|final/.test(cleanStatus)) {
            return "listo";
        }

        if (/acept|prepar|proceso|curso/.test(cleanStatus)) {
            return "proceso";
        }

        return "pendiente";
    };

    const getTrackingMessage = (pedido, code) => {
        const state = normalizeTrackingStatus(pedido?.estadoNormalizado || pedido?.estado);
        const visibleCode = pedido?.codigo || code;

        if (state === "rechazado") {
            const reason = String(pedido?.motivo_rechazo || pedido?.motivo || "").trim();
            return {
                state,
                type: "canceled",
                message: `Pedido ${visibleCode}: El pedido fue cancelado.${reason ? ` Motivo: ${reason}` : ""}`
            };
        }

        if (state === "listo") {
            return {
                state,
                type: "ready",
                message: `Pedido ${visibleCode}: El pedido esta listo para que lo recojas.`
            };
        }

        if (state === "proceso") {
            return {
                state,
                type: "progress",
                message: `Pedido ${visibleCode}: El pedido esta siendo preparado.`
            };
        }

        return {
            state,
            type: "pending",
            message: `Pedido ${visibleCode}: El pedido esta aun pendiente.`
        };
    };

    const searchTracking = async (code) => {
        if (!code) {
            setTrackingState("");
            setMessage("Ingresa tu numero de pedido para buscarlo.", "error");
            return;
        }

        setMessage("");
        setTrackingState("");
        setLoading(true);

        try {
            const [response] = await Promise.all([
                fetch(`${trackingApiUrl}?codigo=${encodeURIComponent(code)}`),
                waitForLoading()
            ]);
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload.found) {
                setTrackingState("");
                setMessage(payload.message || "No encontramos un pedido con ese codigo.", "error");
                return;
            }

            const result = getTrackingMessage(payload.pedido, code);
            setTrackingState(result.state);
            setMessage(result.message, result.type);
        } catch (error) {
            setTrackingState("");
            setMessage("No se pudo buscar el pedido. Intentalo nuevamente.", "error");
        } finally {
            setLoading(false);
        }
    };

    trackingForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await searchTracking(trackingInput?.value.trim() || "");
    });

    contactForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(contactForm);
        const nombre = String(formData.get("nombre") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const pedido = String(formData.get("pedido") || "").trim();
        const asunto = String(formData.get("asunto") || "Duda general").trim();
        const otroAsunto = String(formData.get("otroAsunto") || "").trim();
        const mensaje = String(formData.get("mensaje") || "").trim();

        if (!nombre || !email || !mensaje || (asunto === "Otro" && !otroAsunto)) {
            formStatus.textContent = "Completa tu nombre, correo y mensaje antes de enviar.";
            formStatus.className = "form-status is-error";
            return;
        }

        const finalSubject = asunto === "Otro" ? otroAsunto : asunto;
        const subject = pedido ? `${finalSubject} - Pedido ${pedido}` : finalSubject;
        const body = [
            `Nombre: ${nombre}`,
            `Correo: ${email}`,
            pedido ? `Pedido: ${pedido}` : "",
            `Asunto: ${finalSubject}`,
            "",
            mensaje
        ].filter(Boolean).join("\n");
        const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        formStatus.textContent = "Listo, se abrira tu correo para enviar el mensaje.";
        formStatus.className = "form-status is-success";
        window.location.href = mailto;
    });

    const autoSearchPedido = () => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("pedido") || params.get("codigo") || params.get("tracking") || "";

        if (!code || !trackingInput) {
            return;
        }

        trackingInput.value = code.startsWith("#") ? code : `#${code}`;
        document.getElementById("seguimiento")?.scrollIntoView({ behavior: "smooth", block: "start" });
        searchTracking(code);
    };

    autoSearchPedido();
})();
