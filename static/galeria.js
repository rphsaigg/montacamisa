/* Monta Camisa (modo grátis) — busca no acervo e download de estampa em PNG/SVG, tudo no navegador. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const evento = (e, a) => { try { window.mcEvento && window.mcEvento(e, a); } catch (_) {} };
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- Busca ----------
  const q = $("#g-q");
  if (q) {
    let acervo = null, t = null, tEv = null;
    const carregar = () => acervo || (acervo = fetch("/static/estampas/indice.json").then(r => r.json()).then(d => d.estampas));
    q.addEventListener("focus", carregar, { once: true });
    q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(buscar, 180); });
    async function buscar() {
      const termo = norm(q.value), res = $("#g-resultados"), info = $("#g-info");
      if (termo.length < 2) { res.hidden = info.hidden = true; return; }
      const itens = await carregar();
      const palavras = termo.split(/\s+/);
      const achados = itens.filter(e => { const alvo = norm(e.n) + " " + e.k; return palavras.every(p => alvo.includes(p)); });
      // nome começando pelo termo vem primeiro
      achados.sort((a, b) => (norm(b.n).startsWith(termo) ? 1 : 0) - (norm(a.n).startsWith(termo) ? 1 : 0));
      res.innerHTML = achados.slice(0, 120).map(e =>
        `<a class="g-item ${e.t}" href="/estampa/${e.id}/" title="${esc(e.n)}"><img src="${e.a}" alt="${esc(e.n)}" loading="lazy" width="120" height="120"><span>${esc(e.n)}</span></a>`).join("");
      info.textContent = achados.length ? `${achados.length} estampa(s) para “${q.value.trim()}”${achados.length > 120 ? " — mostrando as 120 primeiras" : ""}.`
        : `Nada encontrado para “${q.value.trim()}”. Tente outra palavra ou crie a sua com a IA no editor.`;
      res.hidden = !achados.length; info.hidden = false;
      clearTimeout(tEv); tEv = setTimeout(() => evento("busca", termo.slice(0, 60)), 1500);
    }
  }

  // ---------- Página da estampa ----------
  const det = $("#g-detalhe");
  if (!det) return;
  const url = det.dataset.svg, id = det.dataset.id, PX = +det.dataset.px || 3000;
  let cor = null, svgOriginal = null, urlSvg = null;
  const original = () => svgOriginal || (svgOriginal = fetch(url).then(r => r.text()));
  async function svgAtual() {
    let s = await original();
    if (cor) s = s.replace(/currentColor/g, cor);
    return s;
  }
  async function aplicarCor(c) {
    cor = c;
    const s = await svgAtual();
    if (urlSvg) URL.revokeObjectURL(urlSvg);
    urlSvg = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
    $("#g-img").src = urlSvg;
    $("#g-baixar-svg").href = urlSvg;
  }
  const cores = $("#g-cores");
  if (cores) {
    cores.addEventListener("click", e => {
      const b = e.target.closest("button[data-cor]"); if (!b) return;
      cores.querySelectorAll("button").forEach(x => x.classList.toggle("ativo", x === b));
      aplicarCor(b.dataset.cor);
    });
    $("#g-cor-livre").addEventListener("input", e => { cores.querySelectorAll("button").forEach(x => x.classList.remove("ativo")); aplicarCor(e.target.value); });
    aplicarCor(cores.querySelector("button.ativo").dataset.cor);
  }

  // SVG → PNG transparente no tamanho de impressão (lado maior = PX)
  async function png() {
    const doc = new DOMParser().parseFromString(await svgAtual(), "image/svg+xml");
    const svg = doc.documentElement;
    const vb = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    let w = vb.length === 4 ? vb[2] : parseFloat(svg.getAttribute("width")) || 100;
    let h = vb.length === 4 ? vb[3] : parseFloat(svg.getAttribute("height")) || 100;
    if (vb.length !== 4) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const k = PX / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k);
    svg.setAttribute("width", w); svg.setAttribute("height", h);
    const blobUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    try {
      const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = blobUrl; });
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      return await new Promise(ok => c.toBlob(ok, "image/png"));
    } finally { URL.revokeObjectURL(blobUrl); }
  }
  function baixar(href, nome) { const a = document.createElement("a"); a.href = href; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }
  $("#g-baixar-png").addEventListener("click", async e => {
    const b = e.currentTarget, txt = b.textContent; b.disabled = true; b.textContent = "Gerando PNG…";
    try {
      const u = URL.createObjectURL(await png());
      baixar(u, `${id}-montacamisa.png`); setTimeout(() => URL.revokeObjectURL(u), 10000);
      evento("baixar", id + ".png");
    } catch (_) { alert("Não foi possível gerar o PNG neste navegador. Baixe o SVG ou use o editor."); }
    finally { b.disabled = false; b.textContent = txt; }
  });
  $("#g-baixar-svg").addEventListener("click", () => evento("baixar", id + ".svg"));
})();
