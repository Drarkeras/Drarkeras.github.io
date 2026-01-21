function actualizarMarcos() {
    document.querySelectorAll(".ascii-box").forEach(pre => {
        if (!pre.dataset.original) {
            pre.dataset.original = pre.textContent.trim();
        }

        const lineasOriginales = pre.dataset.original.split("\n");

        const span = document.createElement("span");
        span.style.visibility = "hidden";
        span.style.whiteSpace = "pre";
        span.style.fontFamily = getComputedStyle(pre).fontFamily;
        span.textContent = "X";
        document.body.appendChild(span);

        const charWidth = span.getBoundingClientRect().width;
        document.body.removeChild(span);

        const anchoPx = pre.clientWidth;
        if (anchoPx === 0) return;

        const chars = Math.floor(anchoPx / charWidth);
        const interior = Math.max(chars - 2, 10);

        const lineaSup = "┌" + "─".repeat(interior) + "┐";
        const lineaInf = "└" + "─".repeat(interior) + "┘";

        const contenidoAjustado = lineasOriginales.map(linea => {
            const trimmed = linea.trim();
            const paddingTotal = interior - trimmed.length;
            const left = Math.floor(paddingTotal / 2);
            const right = paddingTotal - left;
            return "│" + " ".repeat(left) + trimmed + " ".repeat(right) + "│";
        });

        pre.textContent = [lineaSup, ...contenidoAjustado, lineaInf].join("\n");
    });
}

window.addEventListener("load", actualizarMarcos);
window.addEventListener("resize", actualizarMarcos);
