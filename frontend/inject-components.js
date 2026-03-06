async function inject(name, selector) {
  try {
    const res = await fetch(`/components/${name}.html`);
    if (!res.ok) return;
    const html = await res.text();
    document
      .querySelectorAll(`[data-include=\"${name}\"]`)
      .forEach((el) => (el.innerHTML = html));
  } catch (e) {
    console.error("inject error", e);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  inject("header", '[data-include="header"]');
  inject("footer", '[data-include="footer"]');
});
