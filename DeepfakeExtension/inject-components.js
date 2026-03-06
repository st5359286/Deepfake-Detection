async function injectExt(name) {
  try {
    const res = await fetch(`./components/${name}.html`);
    if (!res.ok) return;
    const html = await res.text();
    document
      .querySelectorAll(`[data-include="${name}"]`)
      .forEach((el) => (el.innerHTML = html));
  } catch (e) {
    console.error("inject error", e);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  injectExt("header");
  injectExt("footer");
});
