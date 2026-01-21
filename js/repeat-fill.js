function repeatFill() {
    document.querySelectorAll(".repeat-fill").forEach(el => {
        if (!el.dataset.pattern) {
            el.dataset.pattern = el.textContent;
        }

        const pattern = el.dataset.pattern;
        if (!pattern.trim()) return;

        const measure = document.createElement("span");
        measure.style.position = "absolute";
        measure.style.visibility = "hidden";
        measure.style.whiteSpace = "pre";
        measure.style.fontFamily = getComputedStyle(el).fontFamily;
        measure.textContent = pattern;

        document.body.appendChild(measure);
        const patternWidth = measure.getBoundingClientRect().width;
        document.body.removeChild(measure);

        const containerWidth = el.clientWidth;
        if (containerWidth === 0 || patternWidth === 0) return;

        const repeatCount = Math.ceil(containerWidth / patternWidth);

        el.textContent = pattern.repeat(repeatCount);
    });
}

window.addEventListener("load", repeatFill);
window.addEventListener("resize", repeatFill);