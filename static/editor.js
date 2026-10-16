/* Monta Camisa — editor de camiseta (Fabric.js 5).
 * Camiseta desenhada em SVG como fundo; área de impressão 29×42 cm mapeada para um retângulo do canvas.
 * Objetos (texto, estampas, elementos, imagens) ficam dentro de um clipPath = área de impressão.
 * Exporta PNG 300 dpi da área (3425×4961) por lado + mockup para o pedido.
 */
(async function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = await fetch("/static/config.json").then(r => r.json());
  const ACERVO = await fetch("/static/estampas/indice.json").then(r => r.json());
  let PROD = CFG.produtos[0];
  const C2 = "#C2C2C2";                       // placeholder da cor secundária nos elementos
  const brl = v => "R$ " + v.toFixed(2).replace(".", ",");

  // ---------- Geometria ----------
  const W = 600, H = 700;
  const PX_CM = 8.6;                          // escala do mockup: 1 cm ≈ 8.6 px (29 cm → 250 px)
  const ladoAtual = () => PROD.lados.find(l => l.slug === estado.lado) || PROD.lados[0];
  // Área de impressão (px do canvas) do lado atual. Vistas de manga/peito são ampliadas para dar espaço de edição.
  function areaDe(lado) {
    const l = typeof lado === "string" ? PROD.lados.find(x => x.slug === lado) : lado;
    const [wc, hc] = l.area_cm;
    let esc = PX_CM, cx = 300, cy = 345;
    if (l.vista === "manga") { esc = 22; cy = 330; }
    else if (l.vista === "peito") { esc = 2.0 * PX_CM; cx = 410; cy = 330; }
    else if (PROD.tipo === "ecobag") { cy = 420; }
    else if (PROD.tipo === "moletom" && l.vista === "frente") { cy = 300; }
    else if (PROD.tipo === "jaqueta" || PROD.tipo === "moletom") { cy = 330; }
    else if (PROD.tipo === "oversized") { cy = 360; }
    const w = wc * esc, h = hc * esc;
    return { x: cx - w / 2, y: cy - h / 2, w, h, px: l.area_px, escala: l.area_px[0] / w };
  }
  let AREA = { x: 175, y: 164, w: 250, h: 362 };   // recalculada em aplicarArea()

  // Silhueta de manequim fantasma, construída em metades espelhadas para simetria perfeita (metade esquerda; direita = espelho em x=300).
  function caminhoCamisa(tipo, mod) {
    const bl = mod === "babylook" || mod === "feminina";
    let P;
    if (tipo === "regata") {
      P = bl ? { ombroX: 232, ombroY: 112, mangaX: 232, mangaY: 112, bainhaMX: 196, bainhaMY: 236, axilaX: 196, axilaY: 236, cinturaX: 174, cinturaY: 400, quadrilX: 196, quadrilY: 625, golaX: 262, golaY: 104 }
             : { ombroX: 226, ombroY: 110, mangaX: 226, mangaY: 110, bainhaMX: 182, bainhaMY: 250, axilaX: 182, axilaY: 250, cinturaX: 186, cinturaY: 430, quadrilX: 190, quadrilY: 655, golaX: 254, golaY: 100 };
    } else if (tipo === "oversized") {
      P = { ombroX: 150, ombroY: 140, mangaX: 70, mangaY: 250, bainhaMX: 110, bainhaMY: 320, axilaX: 168, axilaY: 300, cinturaX: 170, cinturaY: 450, quadrilX: 172, quadrilY: 660, golaX: 236, golaY: 104 };
    } else if (tipo === "jaqueta" || tipo === "moletom") {
      P = { ombroX: 156, ombroY: 150, mangaX: 92, mangaY: 430, bainhaMX: 134, bainhaMY: 470, axilaX: 176, axilaY: 262, cinturaX: 180, cinturaY: 450, quadrilX: 182, quadrilY: 655, golaX: 236, golaY: 126 };
    } else {
      P = bl ? { ombroX: 182, ombroY: 134, mangaX: 122, mangaY: 196, bainhaMX: 146, bainhaMY: 228, axilaX: 196, axilaY: 222, cinturaX: 166, cinturaY: 400, quadrilX: 196, quadrilY: 625, golaX: 248, golaY: 104 }
             : { ombroX: 160, ombroY: 124, mangaX: 68, mangaY: 222, bainhaMX: 104, bainhaMY: 268, axilaX: 176, axilaY: 246, cinturaX: 184, cinturaY: 430, quadrilX: 190, quadrilY: 655, golaX: 238, golaY: 100 };
    }
    const { ombroX, ombroY, mangaX, mangaY, bainhaMX, bainhaMY, axilaX, axilaY, cinturaX, cinturaY, quadrilX, quadrilY, golaX, golaY } = P;
    let esq;
    if (tipo === "regata") {
      esq = `M${golaX} ${golaY} C${golaX - 10} ${golaY + 2} ${ombroX + 10} ${ombroY - 2} ${ombroX} ${ombroY} ` +
        `C${ombroX - 10} ${ombroY + 60} ${axilaX - 14} ${axilaY - 60} ${axilaX} ${axilaY} ` +
        `C${axilaX + 4} ${axilaY + 70} ${cinturaX - 2} ${cinturaY - 40} ${cinturaX} ${cinturaY} ` +
        `C${cinturaX + 2} ${cinturaY + 90} ${quadrilX - 4} ${quadrilY - 60} ${quadrilX} ${quadrilY} ` +
        `Q${quadrilX + 2} ${quadrilY + 18} ${quadrilX + 20} ${quadrilY + 18} L300 ${quadrilY + 20} L300 ${golaY} Z`;
    } else if (tipo === "jaqueta" || tipo === "moletom") {
      // manga longa reta até o punho
      esq = `M${golaX} ${golaY} C${golaX - 20} ${golaY + 4} ${ombroX + 20} ${ombroY - 8} ${ombroX} ${ombroY} ` +
        `C${ombroX - 40} ${ombroY + 120} ${mangaX + 10} ${mangaY - 60} ${mangaX} ${mangaY} ` +
        `L${bainhaMX} ${bainhaMY} C${bainhaMX + 10} ${bainhaMY - 80} ${axilaX - 10} ${axilaY + 60} ${axilaX} ${axilaY} ` +
        `C${axilaX + 4} ${axilaY + 70} ${cinturaX - 2} ${cinturaY - 40} ${cinturaX} ${cinturaY} ` +
        `C${cinturaX + 2} ${cinturaY + 90} ${quadrilX - 4} ${quadrilY - 60} ${quadrilX} ${quadrilY} ` +
        `Q${quadrilX + 2} ${quadrilY + 18} ${quadrilX + 20} ${quadrilY + 18} L300 ${quadrilY + 20} L300 ${golaY} Z`;
    } else {
      esq = `M${golaX} ${golaY} C${golaX - 20} ${golaY + 4} ${ombroX + 20} ${ombroY - 8} ${ombroX} ${ombroY} ` +
        `C${ombroX - 30} ${ombroY + 30} ${mangaX + 20} ${mangaY - 30} ${mangaX} ${mangaY} ` +
        `C${mangaX + 8} ${mangaY + 16} ${bainhaMX - 8} ${bainhaMY - 10} ${bainhaMX} ${bainhaMY} ` +
        `C${bainhaMX + 24} ${bainhaMY - 6} ${axilaX - 12} ${axilaY - 2} ${axilaX} ${axilaY} ` +
        `C${axilaX + 4} ${axilaY + 70} ${cinturaX - 2} ${cinturaY - 40} ${cinturaX} ${cinturaY} ` +
        `C${cinturaX + 2} ${cinturaY + 90} ${quadrilX - 4} ${quadrilY - 60} ${quadrilX} ${quadrilY} ` +
        `Q${quadrilX + 2} ${quadrilY + 18} ${quadrilX + 20} ${quadrilY + 18} L300 ${quadrilY + 20} L300 ${golaY} Z`;
    }
    return { esq, ...P, tipo };
  }
  const estado = {
    produto: PROD.slug, lado: PROD.lados[0].slug, cor: PROD.cores[0], modelagem: PROD.modelagens[0].slug, tamanho: PROD.tamanhos.includes("M") ? "M" : PROD.tamanhos[0], qtd: 1,
    artes: {},                               // JSON do fabric por lado
    historico: {}, futuro: {},
  };
  const histDe = lado => (estado.historico[lado] = estado.historico[lado] || []);
  const futDe = lado => (estado.futuro[lado] = estado.futuro[lado] || []);

  // ---------- Canvas ----------
  const canvas = new fabric.Canvas("c", { preserveObjectStacking: true, selection: true, backgroundColor: "transparent" });
  function redimensionar() {
    const wrap = $("#canvas-wrap"); const w = wrap.clientWidth; if (!w) return;
    canvas.setDimensions({ width: w + "px", height: (w * H / W) + "px" }, { cssOnly: true });
    canvas.calcOffset();
  }
  window.addEventListener("resize", redimensionar);
  fabric.Object.prototype.set({
    transparentCorners: false, cornerColor: "#6c5ce7", cornerStrokeColor: "#fff", borderColor: "#6c5ce7",
    cornerSize: 12, cornerStyle: "circle", padding: 6, borderScaleFactor: 2,
  });
  fabric.Object.prototype.controls.mtr.offsetY = -30;
  // Área de impressão (guia) e clip
  const guia = new fabric.Rect({ left: AREA.x, top: AREA.y, width: AREA.w, height: AREA.h, fill: "transparent", stroke: "rgba(108,92,231,.55)", strokeDashArray: [6, 6], strokeWidth: 1.5, selectable: false, evented: false, excludeFromExport: true, name: "guia" });
  const clip = new fabric.Rect({ left: AREA.x, top: AREA.y, width: AREA.w, height: AREA.h, absolutePositioned: true });
  function aplicarArea() {
    AREA = areaDe(estado.lado);
    guia.set({ left: AREA.x, top: AREA.y, width: AREA.w, height: AREA.h }); guia.setCoords();
    clip.set({ left: AREA.x, top: AREA.y, width: AREA.w, height: AREA.h }); clip.setCoords();
  }

  function desenharProduto() {
    const cor = estado.cor.hex;
    const escuro = luminancia(cor) < 0.45;
    const lado = ladoAtual();
    const sombraCor = escuro ? "#000" : "#1b1f3b";
    const luzOp = escuro ? .10 : .55, sombraOp = escuro ? .55 : .16;
    const defsBase = `
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
        <filter id="esc" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#1b1f3b" flood-opacity=".28"/></filter>
        <filter id="grao" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${PROD.tipo === "ecobag" ? ".6" : ".85"}" numOctaves="2" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 ${PROD.tipo === "ecobag" ? .22 : escuro ? .16 : .10} 0"/></filter>
        <linearGradient id="vol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sombraCor}" stop-opacity="${escuro ? .35 : .14}"/><stop offset=".18" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${escuro ? .05 : .16}"/><stop offset=".82" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="${sombraCor}" stop-opacity="${escuro ? .4 : .18}"/></linearGradient>`;
    let forma, decor = "", dobras = "", chao = 660;

    if (lado.vista === "manga") {
      // Vista ampliada da manga: cilindro inclinado com bainha
      forma = `<path d="M120 120 C170 90 430 90 480 120 L520 560 C520 600 80 600 80 560Z"/>`;
      decor = `<path d="M80 560 C80 600 520 600 520 560" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .4 : .22}" stroke-width="3" stroke-dasharray="4 3"/>` +
        `<path d="M86 540 C86 580 514 580 514 540" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .3 : .16}" stroke-width="2"/>` +
        `<path d="M120 120 C170 90 430 90 480 120" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .45 : .25}" stroke-width="3"/>`;
      dobras = `<g filter="url(#blur)"><path d="M150 160 C130 300 120 440 130 560" stroke="${sombraCor}" stroke-opacity="${sombraOp}" stroke-width="40" fill="none"/>
        <path d="M450 160 C470 300 480 440 470 560" stroke="${sombraCor}" stroke-opacity="${sombraOp * .7}" stroke-width="34" fill="none"/>
        <path d="M250 140 C240 300 236 440 240 560" stroke="#fff" stroke-opacity="${luzOp}" stroke-width="22" fill="none"/></g>`;
      chao = 600;
    } else if (lado.vista === "peito") {
      // Zoom 2x na metade superior da jaqueta (capuz, zíper, ombros); área 10x10 cm no peito esquerdo (lado direito da tela)
      const g = caminhoCamisa(PROD.tipo, estado.modelagem);
      const Z = 2.0, ox = 300 - 300 * Z, oy = 60 - g.golaY * Z;   // centraliza a gola no topo
      const meia = `<path d="${g.esq}"/><path d="${g.esq}" transform="translate(600 0) scale(-1 1)"/>`;
      forma = `<g transform="translate(${ox} ${oy}) scale(${Z})">${meia}</g>`;
      const gx = g.golaX, gy = g.golaY;
      const capuz = `<path d="M${gx - 36} ${gy + 40} C${gx - 50} ${gy - 50} ${600 - gx + 50} ${gy - 50} ${600 - gx + 36} ${gy + 40} L${600 - gx - 10} ${gy + 110} Q300 ${gy + 160} ${gx + 10} ${gy + 110}Z" fill="${cor}" filter="url(#esc)"/>` +
        `<path d="M${gx - 36} ${gy + 40} C${gx - 50} ${gy - 50} ${600 - gx + 50} ${gy - 50} ${600 - gx + 36} ${gy + 40} L${600 - gx - 10} ${gy + 110} Q300 ${gy + 160} ${gx + 10} ${gy + 110}Z" fill="${sombraCor}" fill-opacity="${escuro ? .22 : .10}"/>` +
        `<path d="M${gx} ${gy + 30} Q300 ${gy + 120} ${600 - gx} ${gy + 30}" fill="${sombraCor}" fill-opacity="${escuro ? .6 : .4}"/>`;
      const ziper = `<rect x="294" y="${gy + 60}" width="12" height="${g.quadrilY - gy - 50}" fill="${sombraCor}" fill-opacity="${escuro ? .65 : .4}"/><rect x="297" y="${gy + 60}" width="6" height="${g.quadrilY - gy - 50}" fill="#fff" fill-opacity=".25"/>` +
        "".concat(...Array.from({ length: 40 }, (_, i) => `<rect x="295" y="${gy + 64 + i * 12}" width="10" height="5" fill="#fff" fill-opacity=".18"/>`)) +
        `<rect x="292" y="${gy + 70}" width="16" height="26" rx="3" fill="${sombraCor}" fill-opacity=".7"/>`;
      const costura = `<path d="M${g.ombroX} ${g.ombroY + 2} C${g.ombroX + 6} ${g.ombroY + 60} ${g.axilaX - 10} ${g.axilaY - 40} ${g.axilaX} ${g.axilaY} M${600 - g.ombroX} ${g.ombroY + 2} C${594 - g.ombroX} ${g.ombroY + 60} ${610 - g.axilaX} ${g.axilaY - 40} ${600 - g.axilaX} ${g.axilaY}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .45 : .22}" stroke-width="2.5"/>`;
      decor = `<g transform="translate(${ox} ${oy}) scale(${Z})">${capuz}${ziper}${costura}</g>`;
      dobras = `<g transform="translate(${ox} ${oy}) scale(${Z})" filter="url(#blur)"><path d="M${g.axilaX + 10} ${g.axilaY + 20} C${g.axilaX + 30} 380 ${g.axilaX + 24} 520 ${g.axilaX + 18} ${g.quadrilY - 10}" stroke="${sombraCor}" stroke-opacity="${sombraOp}" stroke-width="26" fill="none"/>
        <path d="M${590 - g.axilaX} ${g.axilaY + 20} C${570 - g.axilaX} 380 ${576 - g.axilaX} 520 ${582 - g.axilaX} ${g.quadrilY - 10}" stroke="${sombraCor}" stroke-opacity="${sombraOp * .8}" stroke-width="22" fill="none"/>
        <path d="M250 ${gy + 90} C236 300 232 460 244 ${g.quadrilY - 30}" stroke="#fff" stroke-opacity="${luzOp}" stroke-width="16" fill="none"/>
        <ellipse cx="300" cy="${gy + 130}" rx="150" ry="26" fill="#fff" fill-opacity="${luzOp * .45}"/></g>`;
      chao = 760;
    } else if (PROD.tipo === "ecobag") {
      forma = `<path d="M110 250 H490 L500 650 Q500 668 482 668 H118 Q100 668 100 650Z"/>`;
      // alças
      decor = `<path d="M190 250 C170 120 190 60 240 60 C290 60 300 120 300 250" fill="none" stroke="${cor}" stroke-width="22" filter="url(#esc)"/>` +
        `<path d="M300 250 C300 120 310 60 360 60 C410 60 430 120 410 250" fill="none" stroke="${cor}" stroke-width="22"/>` +
        `<path d="M190 250 C170 120 190 60 240 60 C290 60 300 120 300 250 M300 250 C300 120 310 60 360 60 C410 60 430 120 410 250" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .5 : .3}" stroke-width="22"/>` +
        `<path d="M190 250 C170 120 190 60 240 60 C290 60 300 120 300 250 M300 250 C300 120 310 60 360 60 C410 60 430 120 410 250" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .35 : .22}" stroke-width="2" stroke-dasharray="3 4"/>` +
        `<path d="M110 250 H490" stroke="${sombraCor}" stroke-opacity="${escuro ? .4 : .25}" stroke-width="3" stroke-dasharray="4 3"/>` +
        `<path d="M112 268 H488" stroke="${sombraCor}" stroke-opacity="${escuro ? .3 : .18}" stroke-width="2"/>`;
      dobras = `<g filter="url(#blur)"><path d="M140 290 C130 420 130 540 140 650" stroke="${sombraCor}" stroke-opacity="${sombraOp}" stroke-width="30" fill="none"/>
        <path d="M460 290 C470 420 470 540 460 650" stroke="${sombraCor}" stroke-opacity="${sombraOp * .8}" stroke-width="26" fill="none"/>
        <path d="M250 280 C244 420 244 540 250 650" stroke="#fff" stroke-opacity="${luzOp * .8}" stroke-width="16" fill="none"/></g>`;
      chao = 672;
    } else {
      const g = caminhoCamisa(PROD.tipo, estado.modelagem);
      forma = `<path d="${g.esq}"/><path d="${g.esq}" transform="translate(600 0) scale(-1 1)"/>`;
      const costas = lado.vista === "costas";
      const gx = g.golaX, gy = g.golaY;
      const comCapuz = PROD.tipo === "jaqueta" || PROD.tipo === "moletom";
      if (comCapuz) {
        // capuz (visto de frente/costas)
        const capuz = costas
          ? `<path d="M${gx - 30} ${gy + 30} C${gx - 40} ${gy - 60} ${600 - gx + 40} ${gy - 60} ${600 - gx + 30} ${gy + 30} C${600 - gx} ${gy + 70} ${gx} ${gy + 70} ${gx - 30} ${gy + 30}Z" fill="${cor}" filter="url(#esc)"/>` +
            `<path d="M${gx - 30} ${gy + 30} C${gx - 40} ${gy - 60} ${600 - gx + 40} ${gy - 60} ${600 - gx + 30} ${gy + 30} C${600 - gx} ${gy + 70} ${gx} ${gy + 70} ${gx - 30} ${gy + 30}Z" fill="${sombraCor}" fill-opacity="${escuro ? .25 : .12}"/>`
          : `<path d="M${gx - 36} ${gy + 40} C${gx - 50} ${gy - 50} ${600 - gx + 50} ${gy - 50} ${600 - gx + 36} ${gy + 40} L${600 - gx - 10} ${gy + 110} Q300 ${gy + 160} ${gx + 10} ${gy + 110}Z" fill="${cor}" filter="url(#esc)"/>` +
            `<path d="M${gx - 36} ${gy + 40} C${gx - 50} ${gy - 50} ${600 - gx + 50} ${gy - 50} ${600 - gx + 36} ${gy + 40} L${600 - gx - 10} ${gy + 110} Q300 ${gy + 160} ${gx + 10} ${gy + 110}Z" fill="${sombraCor}" fill-opacity="${escuro ? .22 : .10}"/>` +
            `<path d="M${gx} ${gy + 30} Q300 ${gy + 120} ${600 - gx} ${gy + 30}" fill="${sombraCor}" fill-opacity="${escuro ? .6 : .4}"/>`;   // interior do capuz
        decor += capuz;
        // bolso canguru (frente) e zíper (jaqueta)
        if (!costas) {
          decor += `<path d="M${g.cinturaX + 10} 500 L${g.cinturaX + 40} 440 H${560 - g.cinturaX} L${590 - g.cinturaX} 500 V${g.quadrilY - 10} H${g.cinturaX + 10}Z" fill="${sombraCor}" fill-opacity="${escuro ? .18 : .07}" stroke="${sombraCor}" stroke-opacity="${escuro ? .4 : .22}" stroke-width="2" stroke-dasharray="4 3"/>`;
          if (PROD.tipo === "jaqueta") decor += `<rect x="294" y="${gy + 60}" width="12" height="${g.quadrilY - gy - 50}" fill="${sombraCor}" fill-opacity="${escuro ? .65 : .4}"/><rect x="297" y="${gy + 60}" width="6" height="${g.quadrilY - gy - 50}" fill="#fff" fill-opacity=".25"/><rect x="292" y="${gy + 70}" width="16" height="26" rx="3" fill="${sombraCor}" fill-opacity=".7"/>`;
        }
        // punhos e barra canelados
        decor += `<path d="M${g.mangaX} ${g.mangaY} L${g.bainhaMX} ${g.bainhaMY} M${600 - g.mangaX} ${g.mangaY} L${600 - g.bainhaMX} ${g.bainhaMY}" stroke="${sombraCor}" stroke-opacity="${escuro ? .5 : .3}" stroke-width="14" stroke-dasharray="2 3"/>` +
          `<path d="M${g.quadrilX + 10} ${g.quadrilY + 6} Q300 ${g.quadrilY + 14} ${590 - g.quadrilX} ${g.quadrilY + 6}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .5 : .3}" stroke-width="14" stroke-dasharray="2 3"/>`;
      } else {
        // gola canelada (camiseta/regata/oversized)
        const prof = PROD.tipo === "regata" ? 46 : 62;
        decor += `<path d="M${gx} ${gy} Q300 ${gy + prof} ${600 - gx} ${gy}" fill="none" stroke="${cor}" stroke-width="${PROD.tipo === "regata" ? 12 : 18}" filter="url(#esc)"/>` +
          `<path d="M${gx} ${gy} Q300 ${gy + prof} ${600 - gx} ${gy}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .5 : .28}" stroke-width="${PROD.tipo === "regata" ? 12 : 18}"/>` +
          `<path d="M${gx} ${gy} Q300 ${gy + prof} ${600 - gx} ${gy}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .35 : .18}" stroke-width="18" stroke-dasharray="1.5 3.5"/>` +
          (costas ? `<path d="M${gx} ${gy} Q300 ${gy + 22} ${600 - gx} ${gy}" fill="${sombraCor}" fill-opacity="${escuro ? .5 : .3}"/><rect x="282" y="${gy + 14}" width="36" height="22" rx="3" fill="#fff" fill-opacity="${escuro ? .75 : .9}"/>`   // etiqueta
                  : `<path d="M${gx} ${gy} Q300 ${gy - 14} ${600 - gx} ${gy}" fill="${sombraCor}" fill-opacity="${escuro ? .55 : .35}"/>`);
        if (PROD.tipo === "regata") decor += `<path d="M${g.ombroX} ${g.ombroY} C${g.ombroX - 10} ${g.ombroY + 60} ${g.axilaX - 14} ${g.axilaY - 60} ${g.axilaX} ${g.axilaY} M${600 - g.ombroX} ${g.ombroY} C${610 - g.ombroX} ${g.ombroY + 60} ${614 - g.axilaX} ${g.axilaY - 60} ${600 - g.axilaX} ${g.axilaY}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .5 : .3}" stroke-width="10"/>`;
        // costuras do ombro/manga
        const costuras = (e) => `<path d="M${e * g.ombroX + (1 - e) * (600 - g.ombroX)} ${g.ombroY + 2} C${e * (g.ombroX + 6) + (1 - e) * (594 - g.ombroX)} ${g.ombroY + 60} ${e * (g.axilaX - 10) + (1 - e) * (610 - g.axilaX)} ${g.axilaY - 40} ${e * g.axilaX + (1 - e) * (600 - g.axilaX)} ${g.axilaY}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .45 : .22}" stroke-width="2.5"/>` +
          (PROD.tipo === "regata" ? "" : `<path d="M${e * (g.bainhaMX + 2) + (1 - e) * (598 - g.bainhaMX)} ${g.bainhaMY - 4} L${e * (g.axilaX - 2) + (1 - e) * (602 - g.axilaX)} ${g.axilaY - 10}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .4 : .2}" stroke-width="2" stroke-dasharray="3 3"/>`);
        decor += costuras(1) + costuras(0);
        decor += `<path d="M${g.ombroX + 48} ${g.quadrilY + 4} Q300 ${g.quadrilY + 10} ${552 - g.ombroX} ${g.quadrilY + 4}" fill="none" stroke="${sombraCor}" stroke-opacity="${escuro ? .4 : .2}" stroke-width="2" stroke-dasharray="4 3"/>`;
      }
      if (costas) decor += `<path d="M300 ${gy + 40} V${g.quadrilY - 20}" stroke="#fff" stroke-opacity="${luzOp * .35}" stroke-width="3"/>`;
      dobras = `
      <g filter="url(#blur)">
        <path d="M${g.axilaX + 10} ${g.axilaY + 20} C${g.axilaX + 30} 380 ${g.axilaX + 24} 520 ${g.axilaX + 18} ${g.quadrilY - 10}" stroke="${sombraCor}" stroke-opacity="${sombraOp}" stroke-width="26" fill="none"/>
        <path d="M${590 - g.axilaX} ${g.axilaY + 20} C${570 - g.axilaX} 380 ${576 - g.axilaX} 520 ${582 - g.axilaX} ${g.quadrilY - 10}" stroke="${sombraCor}" stroke-opacity="${sombraOp * .8}" stroke-width="22" fill="none"/>
        <path d="M250 ${g.golaY + 90} C236 300 232 460 244 ${g.quadrilY - 30}" stroke="#fff" stroke-opacity="${luzOp}" stroke-width="16" fill="none"/>
        <path d="M352 ${g.golaY + 80} C372 300 366 480 350 ${g.quadrilY - 30}" stroke="${sombraCor}" stroke-opacity="${sombraOp * .55}" stroke-width="14" fill="none"/>
        <path d="M${g.mangaX + 18} ${g.mangaY - 40} C${g.mangaX + 40} ${g.mangaY - 10} ${g.bainhaMX} ${g.bainhaMY - 40} ${g.axilaX - 4} ${g.axilaY - 60}" stroke="#fff" stroke-opacity="${luzOp * .7}" stroke-width="12" fill="none"/>
        <path d="M${582 - g.mangaX} ${g.mangaY - 40} C${560 - g.mangaX} ${g.mangaY - 10} ${600 - g.bainhaMX} ${g.bainhaMY - 40} ${604 - g.axilaX} ${g.axilaY - 60}" stroke="${sombraCor}" stroke-opacity="${sombraOp * .6}" stroke-width="12" fill="none"/>
        <ellipse cx="300" cy="${g.golaY + 130}" rx="150" ry="26" fill="#fff" fill-opacity="${luzOp * .45}"/>
        <path d="M${g.ombroX} ${g.ombroY} Q300 ${g.ombroY - 30} ${600 - g.ombroX} ${g.ombroY}" stroke="#fff" stroke-opacity="${luzOp * .6}" stroke-width="10" fill="none"/>
      </g>`;
      chao = g.quadrilY + 36;
    }
    const defs = `<defs>${defsBase}<clipPath id="cc">${forma}</clipPath></defs>`;
    const base = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">${defs}
      <ellipse cx="300" cy="${chao}" rx="190" ry="14" fill="#1b1f3b" fill-opacity=".10" filter="url(#blur)"/>
      <g fill="${cor}" filter="url(#esc)">${forma}</g>
      <g clip-path="url(#cc)"><rect width="600" height="700" fill="url(#vol)"/>${dobras}<rect width="600" height="700" filter="url(#grao)"/></g>
      ${decor}
    </svg>`;
    const topo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">${defs}
      <g clip-path="url(#cc)" opacity=".55">${dobras}<rect width="600" height="700" filter="url(#grao)" opacity=".7"/></g>
    </svg>`;
    const carregar = (svg) => new Promise(res => {
      const img = new Image();
      img.onload = () => { const fi = new fabric.Image(img, { left: 0, top: 0, scaleX: W / img.naturalWidth, scaleY: H / img.naturalHeight, selectable: false, evented: false, excludeFromExport: true }); res(fi); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/\s{2,}/g, " "));
    });
    return Promise.all([carregar(base), carregar(topo)]).then(([bg, ov]) => new Promise(res => {
      bg.set({ name: "camisa" }); ov.set({ name: "tecido" });
      canvas.setBackgroundImage(bg, () => canvas.setOverlayImage(ov, () => { canvas.requestRenderAll(); res(); }));
    }));
  }
  const desenharCamisa = desenharProduto;
  function luminancia(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const corContraste = () => (luminancia(estado.cor.hex) < 0.45 ? "#ffffff" : "#1d1d1f");

  // ---------- Histórico ----------
  let travaHist = false;
  const serializar = () => { const j = canvas.toJSON(["name", "mc"]); (j.objects || []).forEach(o => { if (o.type === "textbox") delete o.path; }); return JSON.stringify(j); };
  function snapshot() {
    if (travaHist) return;
    const j = serializar();
    const h = histDe(estado.lado);
    if (h[h.length - 1] === j) return;
    h.push(j); if (h.length > 40) h.shift();
    estado.futuro[estado.lado] = [];
    estado.artes[estado.lado] = j;
    salvarRascunho();
    atualizarPreco(); checarArea();
  }
  async function carregarJSON(j) {
    travaHist = true;
    aplicarArea();
    await new Promise(res => canvas.loadFromJSON(j || '{"objects":[]}', () => res()));
    canvas.getObjects().forEach(o => {
      if (o.name !== "guia") o.clipPath = clip;
      // Textbox.fromObject não reconstrói `path` (texto em arco) — recria a partir de mc.arco
      if (o.type === "textbox") { o.path = null; if (o.mc && o.mc.arco) aplicarArco(o, o.mc.arco); }
    });
    if (!canvas.getObjects().some(o => o.name === "guia")) canvas.add(guia);
    canvas.sendToBack(guia);
    await desenharCamisa();
    travaHist = false;
    canvas.requestRenderAll(); atualizarPreco(); checarArea();
  }
  function desfazer() {
    const h = histDe(estado.lado); if (h.length < 2) return;
    futDe(estado.lado).push(h.pop()); estado.artes[estado.lado] = h[h.length - 1]; carregarJSON(estado.artes[estado.lado]); salvarRascunho();
  }
  function refazer() {
    const f = futDe(estado.lado); if (!f.length) return;
    const j = f.pop(); histDe(estado.lado).push(j); estado.artes[estado.lado] = j; carregarJSON(j); salvarRascunho();
  }
  canvas.on("object:modified", snapshot);
  canvas.on("object:added", e => { if (e.target.name !== "guia") snapshot(); });
  canvas.on("object:removed", e => { if (e.target.name !== "guia") snapshot(); });
  canvas.on("text:changed", () => { atualizarPreco(); });
  canvas.on("text:editing:exited", snapshot);

  // ---------- Objetos: adicionar ----------
  function adicionar(obj, opts = {}) {
    obj.clipPath = clip;
    const larg = (opts.w || 0.6) * AREA.w;
    if (obj.type !== "textbox") { obj.scaleToWidth(larg); }
    obj.set({ left: AREA.x + AREA.w * (opts.x ?? 0.5), top: AREA.y + AREA.h * (opts.y ?? 0.45), originX: "center", originY: "center" });
    if (opts.angulo) obj.set("angle", opts.angulo);
    canvas.add(obj); if (!opts.semSelecionar) canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    return obj;
  }

  function novoTexto(texto, fonte, opts = {}) {
    const f = CFG.fontes.find(x => x.nome === fonte) || CFG.fontes[0];
    const t = new fabric.Textbox(texto, {
      fontFamily: f.nome, fontWeight: f.peso || "normal", fontSize: 44, fill: opts.cor || corContraste(), textAlign: "center",
      width: (opts.w || 0.8) * AREA.w, splitByGrapheme: false, editable: true, lockScalingFlip: true,
      strokeUniform: true, paintFirst: "stroke", mc: { tipo: "texto" },
    });
    ajustarFonteNaLargura(t, (opts.w || 0.8) * AREA.w);
    adicionar(t, { ...opts, w: null });
    if (opts.arco) aplicarArco(t, opts.arco);
    return t;
  }
  function ajustarFonteNaLargura(t, alvo) {
    // ajusta a fonte para a linha mais larga ocupar `alvo` px (visual de "nome grande"); o Textbox expande
    // a própria largura quando uma palavra não cabe, por isso a largura-alvo vem de fora.
    t.set({ fontSize: 100, width: 5000 }); t.initDimensions();
    const maior = Math.max(1, t.calcTextWidth());
    const fs = Math.max(10, Math.min(170, 100 * (alvo / maior) * 0.98));
    t.set({ fontSize: fs, width: alvo + 4 }); t.initDimensions();
    for (let i = 0; i < 20 && t.textLines.length > t.text.split("\n").length; i++) { t.set("fontSize", t.fontSize * 0.94); t.initDimensions(); }
  }

  async function novoSVG(url, opts = {}) {
    let svg = await fetch(url).then(r => r.text());
    const cor1 = opts.cor1 || corContraste();
    const cor2 = opts.cor2 || (luminancia(estado.cor.hex) < 0.45 ? "#ffd93d" : "#ff6b9d");
    const recolorivel = /currentColor/.test(svg);
    if (recolorivel) svg = svg.replace(/currentColor/g, cor1).replace(new RegExp(C2, "gi"), cor2);
    return new Promise(res => fabric.loadSVGFromString(svg, (objs, o) => {
      const g = fabric.util.groupSVGElements(objs, o);
      g.set({ mc: { tipo: opts.tipo || "estampa", url, recolorivel, cor1, cor2 } });
      adicionar(g, opts); res(g);
    }));
  }
  function recolorirSVG(g, cor1, cor2) {
    if (!g.mc || !g.mc.recolorivel) return;
    const antigo1 = g.mc.cor1, antigo2 = g.mc.cor2;
    const troca = o => {
      ["fill", "stroke"].forEach(p => {
        const v = o[p]; if (!v || typeof v !== "string") return;
        const vl = v.toLowerCase();
        if (vl === antigo1.toLowerCase()) o.set(p, cor1);
        else if (vl === antigo2.toLowerCase()) o.set(p, cor2);
      });
    };
    if (g._objects) g._objects.forEach(troca); else troca(g);
    g.mc.cor1 = cor1; g.mc.cor2 = cor2;
    g.dirty = true; canvas.requestRenderAll();
  }

  function novaImagem(file) {
    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url, img => {
      const lado = Math.max(img.width, img.height);
      img.set({ mc: { tipo: "imagem", pxOriginal: [img.width, img.height] } });
      adicionar(img, { w: 0.7 });
      if (lado < 1500) toast(`Imagem com ${lado}px no lado maior: pode sair pouco nítida. Ideal: 1500px ou mais.`, 6000);
      // guarda o arquivo para o upload no pedido
      img.mc.arquivo = file;
    }, { crossOrigin: "anonymous" });
  }

  /** Imagem por URL (geradas por IA, servidas pelo Worker com CORS) — persiste no rascunho porque o JSON guarda só a URL. */
  function novaImagemURL(url, meta = {}) {
    return new Promise(resolve => {
      fabric.Image.fromURL(url, img => {
        if (!img || !img.width) { toast("Não foi possível carregar a imagem."); return resolve(null); }
        img.set({ mc: { tipo: "imagem", pxOriginal: [img.width, img.height], ...meta } });
        adicionar(img, { w: 0.6 });
        resolve(img);
      }, { crossOrigin: "anonymous" });
    });
  }

  // ---------- Estampas por IA ----------
  const ia = { estilo: "auto", itens: JSON.parse(sessionStorage.getItem("mc_ia") || "[]") };
  $$("#ia-estilos button").forEach(b => b.onclick = () => { ia.estilo = b.dataset.estilo; $$("#ia-estilos button").forEach(x => x.classList.toggle("ativo", x === b)); });
  function renderIA() {
    const box = $("#ia-resultados"); box.innerHTML = "";
    ia.itens.slice(0, 12).forEach(it => {
      const b = document.createElement("button"); b.className = "res"; b.type = "button"; b.title = it.prompt;
      b.innerHTML = `<img src="${it.url}" alt="" loading="lazy"><span>Usar na peça</span>`;
      b.onclick = async () => { b.disabled = true; await novaImagemURL(it.url, { ia: it.prompt }); b.disabled = false; toast("Estampa adicionada — arraste e redimensione 🙂"); };
      box.appendChild(b);
    });
  }
  renderIA();
  /**
   * Remove o fundo claro por preenchimento a partir das bordas (a IA gera "sticker" sobre branco).
   * Pixels conectados à borda e próximos da cor dela ficam transparentes, com borda suavizada.
   */
  async function removerFundo(url) {
    const img = await new Promise((ok, err) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = err; i.src = url; });
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data, W = c.width, H = c.height;
    // cor do fundo = mediana dos cantos
    const cantos = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + W - 1) * 4].map(i => [d[i], d[i + 1], d[i + 2]]);
    const bg = [0, 1, 2].map(k => cantos.map(c => c[k]).sort((a, b) => a - b)[2]);
    const TOL = 60, TOL2 = TOL * TOL;
    const dist2 = i => { const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2]; return dr * dr + dg * dg + db * db; };
    const vis = new Uint8Array(W * H); const fila = [];
    const push = (px, py) => { const k = py * W + px; if (vis[k]) return; vis[k] = 1; if (dist2(k * 4) <= TOL2) fila.push(k); else vis[k] = 2; };
    for (let i = 0; i < W; i++) { push(i, 0); push(i, H - 1); } for (let j = 0; j < H; j++) { push(0, j); push(W - 1, j); }
    const fundo = new Uint8Array(W * H);
    while (fila.length) { const k = fila.pop(); fundo[k] = 1; const px = k % W, py = (k / W) | 0; if (px > 0) push(px - 1, py); if (px < W - 1) push(px + 1, py); if (py > 0) push(px, py - 1); if (py < H - 1) push(px, py + 1); }
    // aplica alfa: fundo → 0; borda do objeto → alfa proporcional à distância da cor de fundo (anti-serrilhado)
    for (let k = 0; k < W * H; k++) {
      if (fundo[k]) { d[k * 4 + 3] = 0; continue; }
      const px = k % W, py = (k / W) | 0;
      const vizinhoFundo = (px > 0 && fundo[k - 1]) || (px < W - 1 && fundo[k + 1]) || (py > 0 && fundo[k - W]) || (py < H - 1 && fundo[k + W]);
      if (vizinhoFundo) { const t = Math.min(1, Math.sqrt(dist2(k * 4)) / (TOL * 1.6)); d[k * 4 + 3] = Math.round(255 * t); }
    }
    x.putImageData(im, 0, 0);
    // recorta nas bordas do conteúdo com margem
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let k = 0; k < W * H; k++) if (d[k * 4 + 3] > 8) { const px = k % W, py = (k / W) | 0; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
    if (maxX <= minX || maxY <= minY) return c.toDataURL("image/png");
    const m = 8, cw = Math.min(W, maxX - minX + 1 + 2 * m), ch = Math.min(H, maxY - minY + 1 + 2 * m);
    const out = document.createElement("canvas"); out.width = cw; out.height = ch;
    out.getContext("2d").drawImage(c, Math.max(0, minX - m), Math.max(0, minY - m), cw, ch, 0, 0, cw, ch);
    return out.toDataURL("image/png");
  }
  $("#ia-gerar").onclick = async () => {
    const prompt = $("#ia-prompt").value.trim(), st = $("#ia-status"), btn = $("#ia-gerar");
    if (prompt.length < 3) return toast("Descreva a estampa primeiro 🙂");
    if (!CFG.worker_url) return toast("Geração por IA disponível em breve.");
    const semFundo = $("#ia-sem-fundo").checked;
    btn.disabled = true; st.textContent = "Desenhando sua estampa… (10 a 20 segundos)";
    try {
      const r = await fetch(`${CFG.worker_url}/ia/estampa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, estilo: ia.estilo, fundo: semFundo ? "sem" : "com" }) }).then(r => r.json());
      if (!r.url) throw new Error(r.erro || "sem imagem");
      let url = r.url;
      if (semFundo) {
        st.textContent = "Recortando o fundo…";
        const png = await removerFundo(r.url);
        const g = await fetch(`${CFG.worker_url}/ia/guardar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagem: png }) }).then(r => r.json());
        if (g.url) url = g.url;
      }
      ia.itens.unshift({ url, prompt, t: Date.now() }); ia.itens = ia.itens.slice(0, 12);
      sessionStorage.setItem("mc_ia", JSON.stringify(ia.itens)); renderIA();
      await novaImagemURL(url, { ia: prompt });
      st.textContent = r.restantes > 0 ? `Pronto! Você ainda pode gerar ${r.restantes} hoje.` : "Pronto! Essa foi a última de hoje.";
    } catch (e) { st.textContent = ""; toast(e.message || "Não deu certo. Tente de novo.", 6000); }
    btn.disabled = false;
  };

  // ---------- Texto em arco ----------
  function aplicarArco(t, intensidade) {
    // intensidade -1..1 (negativo = sorriso invertido/arco para cima). 0 remove.
    t.mc = { ...(t.mc || {}), arco: intensidade };
    if (!intensidade) { t.set({ path: null, pathAlign: "center" }); t.initDimensions(); canvas.requestRenderAll(); return; }
    const larg = Math.max(t.width, t.calcTextWidth());
    const r = larg / (Math.PI * Math.abs(intensidade));
    const h = r - Math.sqrt(Math.max(0, r * r - (larg / 2) ** 2));
    const sweep = intensidade > 0 ? 0 : 1;
    const y = intensidade > 0 ? h : 0;
    const d = intensidade > 0
      ? `M 0 ${h} A ${r} ${r} 0 0 1 ${larg} ${h}`
      : `M 0 0 A ${r} ${r} 0 0 0 ${larg} 0`;
    const path = new fabric.Path(d, { fill: "", stroke: "", visible: false });
    t.set({ path, pathAlign: "center", pathSide: "left", textAlign: "center" });
    t.initDimensions(); t.dirty = true; canvas.requestRenderAll();
  }

  // ---------- Modelos prontos ----------
  async function aplicarModelo(m) {
    travaHist = true;
    canvas.getObjects().filter(o => o.name !== "guia").forEach(o => canvas.remove(o));
    const cor1 = corContraste(), cor2 = luminancia(estado.cor.hex) < 0.45 ? "#ffd93d" : "#ff6b9d";
    for (const c of m.camadas) {
      const corDe = n => (n === 2 ? cor2 : cor1);
      if (c.tipo === "txt") novoTexto(c.texto, c.fonte, { x: c.x, y: c.y, w: c.w, cor: corDe(c.cor), arco: c.arco, semSelecionar: true });
      else {
        const it = ACERVO.estampas.find(e => e.id === c.id); if (!it) continue;
        await novoSVG(it.a, { x: c.x, y: c.y, w: c.w, cor1: corDe(c.cor || 1), cor2: c.cor === 2 ? cor1 : cor2, tipo: it.t === "elemento" ? "elemento" : "estampa", semSelecionar: true });
      }
    }
    canvas.discardActiveObject(); travaHist = false; snapshot(); canvas.requestRenderAll();
    mostrarAba("texto"); toast("Modelo aplicado. Dê dois cliques no texto para trocar o nome.", 4000);
  }

  // ---------- UI: abas ----------
  function mostrarAba(nome) {
    $$(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === nome));
    $$(".aba-conteudo").forEach(s => s.classList.toggle("ativa", s.dataset.aba === nome));
  }
  $$(".aba").forEach(b => b.onclick = () => mostrarAba(b.dataset.aba));

  // Modelos
  const gradeModelos = $("#grade-modelos");
  CFG.modelos.forEach(m => {
    const b = document.createElement("button"); b.className = "modelo"; b.title = m.nome;
    b.innerHTML = `<div class="mini" data-m="${m.slug}"></div><span>${m.nome}</span>`;
    b.onclick = () => aplicarModelo(m); gradeModelos.appendChild(b);
  });
  // miniaturas dos modelos: renderizadas num canvas pequeno
  async function miniaturasModelos() {
    for (const m of CFG.modelos) {
      const el = $(`.mini[data-m="${m.slug}"]`); if (!el) continue;
      const mini = new fabric.StaticCanvas(null, { width: 160, height: 160, backgroundColor: "#f3f1fb" });
      const area = { x: 10, y: 10, w: 140, h: 140 };
      for (const c of m.camadas) {
        if (c.tipo === "txt") {
          const f = CFG.fontes.find(x => x.nome === c.fonte) || CFG.fontes[0];
          const t = new fabric.Textbox(c.texto, { fontFamily: f.nome, fontWeight: f.peso || "normal", fontSize: 40, fill: c.cor === 2 ? "#ff6b9d" : "#1d1d1f", textAlign: "center", width: (c.w || .8) * area.w, originX: "center", originY: "center" });
          ajustarFonteNaLargura(t, (c.w || .8) * area.w);
          t.set({ left: area.x + area.w * c.x, top: area.y + area.h * c.y }); mini.add(t);
        } else {
          const it = ACERVO.estampas.find(e => e.id === c.id); if (!it) continue;
          let svg = await fetch(it.a).then(r => r.text());
          svg = svg.replace(/currentColor/g, c.cor === 2 ? "#ff6b9d" : "#1d1d1f").replace(new RegExp(C2, "gi"), c.cor === 2 ? "#1d1d1f" : "#ff6b9d");
          await new Promise(res => fabric.loadSVGFromString(svg, (objs, o) => {
            const g = fabric.util.groupSVGElements(objs, o); g.scaleToWidth((c.w || .6) * area.w);
            g.set({ left: area.x + area.w * c.x, top: area.y + area.h * c.y, originX: "center", originY: "center" }); mini.add(g); res();
          }));
        }
      }
      mini.renderAll();
      const img = new Image(); img.src = mini.toDataURL({ format: "png" }); img.alt = m.nome; el.appendChild(img);
    }
  }

  // Frases prontas
  CFG.frases.forEach((f, i) => {
    const b = document.createElement("button"); b.className = "frase"; b.style.fontFamily = `'${f.fonte}'`; b.textContent = f.texto;
    b.onclick = () => { novoTexto(f.texto, f.fonte); mostrarAba("texto"); }; $("#lista-frases").appendChild(b);
  });
  const params = new URLSearchParams(location.search);
  if (params.has("frase") && CFG.frases[+params.get("frase")]) { const f = CFG.frases[+params.get("frase")]; setTimeout(() => novoTexto(f.texto, f.fonte), 600); }
  if (params.has("modelo")) { const m = CFG.modelos.find(x => x.slug === params.get("modelo")); if (m) setTimeout(() => aplicarModelo(m), 600); }

  // Texto: fontes por estilo
  let estiloFonte = "todas", fonteEscolhida = CFG.fontes[0].nome;
  const filtroEstilos = $("#filtro-estilos");
  [["todas", "Todas"], ...Object.entries(CFG.estilos_fonte)].forEach(([k, v]) => {
    const b = document.createElement("button"); b.textContent = v; b.className = k === "todas" ? "ativo" : "";
    b.onclick = () => { estiloFonte = k; $$("button", filtroEstilos).forEach(x => x.classList.toggle("ativo", x === b)); renderFontes(); };
    filtroEstilos.appendChild(b);
  });
  function renderFontes() {
    const g = $("#grade-fontes"); g.innerHTML = "";
    const amostra = ($("#txt-novo").value.trim() || "Seu nome").slice(0, 14);
    CFG.fontes.filter(f => estiloFonte === "todas" || f.estilo === estiloFonte).forEach(f => {
      const b = document.createElement("button"); b.className = "fonte" + (f.nome === fonteEscolhida ? " ativa" : "");
      b.style.fontFamily = `'${f.nome}'`; b.style.fontWeight = f.peso || 400; b.textContent = amostra; b.title = f.nome;
      b.onclick = () => { fonteEscolhida = f.nome; renderFontes(); const a = canvas.getActiveObject(); if (a && a.type === "textbox") { a.set({ fontFamily: f.nome, fontWeight: f.peso || "normal" }); a.initDimensions(); canvas.requestRenderAll(); snapshot(); } };
      g.appendChild(b);
    });
  }
  renderFontes();
  $("#txt-novo").addEventListener("input", renderFontes);
  $("#btn-add-texto").onclick = () => { const v = $("#txt-novo").value.trim() || "Seu nome"; novoTexto(v, fonteEscolhida); $("#txt-novo").value = ""; renderFontes(); };
  const selFonte = $("#prop-fonte");
  CFG.fontes.forEach(f => { const o = document.createElement("option"); o.value = f.nome; o.textContent = f.nome; o.style.fontFamily = `'${f.nome}'`; selFonte.appendChild(o); });

  // Elementos e estampas (grades com lazy render)
  const catsPorSlug = Object.fromEntries(ACERVO.categorias.map(c => [c.slug, c]));
  function montarFiltro(container, cats, aoEscolher) {
    container.innerHTML = "";
    const todas = document.createElement("button"); todas.textContent = "Todas"; todas.className = "ativo"; container.appendChild(todas);
    todas.onclick = () => { $$("button", container).forEach(x => x.classList.toggle("ativo", x === todas)); aoEscolher(null); };
    cats.forEach(slug => {
      const c = catsPorSlug[slug]; if (!c) return;
      const b = document.createElement("button"); b.textContent = c.nome; b.dataset.cat = slug;
      b.onclick = () => { $$("button", container).forEach(x => x.classList.toggle("ativo", x === b)); aoEscolher(slug); };
      container.appendChild(b);
    });
  }
  function renderGrade(container, itens, limite = 160) {
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    itens.slice(0, limite).forEach(it => {
      const b = document.createElement("button"); b.className = "estampa " + it.t; b.title = it.n;
      const img = document.createElement("img"); img.loading = "lazy"; img.src = it.a; img.alt = it.n; b.appendChild(img);
      b.onclick = () => novoSVG(it.a, { tipo: it.t === "elemento" ? "elemento" : "estampa", w: it.t === "elemento" ? 0.9 : 0.45 });
      frag.appendChild(b);
    });
    if (itens.length > limite) {
      const mais = document.createElement("button"); mais.className = "mais"; mais.textContent = `Mostrar mais (${itens.length - limite})`;
      mais.onclick = () => renderGrade(container, itens, limite + 160); frag.appendChild(mais);
    }
    container.appendChild(frag);
  }
  const grupoEl = ACERVO.grupos.find(g => g.slug === "elementos"), grupoSt = ACERVO.grupos.find(g => g.slug === "estampas");
  const elementos = ACERVO.estampas.filter(e => e.t === "elemento"), estampas = ACERVO.estampas.filter(e => e.t !== "elemento");
  let catEl = null, catSt = null, busca = "";
  montarFiltro($("#filtro-elementos"), grupoEl.cats, c => { catEl = c; renderGrade($("#grade-elementos"), elementos.filter(e => !catEl || e.c === catEl)); });
  renderGrade($("#grade-elementos"), elementos);
  function filtrarEstampas() {
    const q = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const r = estampas.filter(e => (!catSt || e.c === catSt) && (!q || e.k.includes(q) || e.n.toLowerCase().includes(q)));
    $("#qtd-estampas").textContent = `${r.length} de ${estampas.length} estampas`;
    renderGrade($("#grade-estampas"), r);
  }
  montarFiltro($("#filtro-cats"), grupoSt.cats, c => { catSt = c; filtrarEstampas(); });
  $("#busca-estampas").addEventListener("input", e => { busca = e.target.value; filtrarEstampas(); });
  filtrarEstampas();

  // Imagem
  $("#arq-imagem").addEventListener("change", e => { const f = e.target.files[0]; if (f) { if (f.size > 15e6) return toast("Arquivo acima de 15 MB."); novaImagem(f); } e.target.value = ""; });
  $("#canvas-wrap").addEventListener("dragover", e => e.preventDefault());
  $("#canvas-wrap").addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) novaImagem(f); });

  // ---------- Barra de propriedades ----------
  const props = $("#props"), propsCores = $("#props-cores");
  function renderProps() {
    const a = canvas.getActiveObject();
    props.hidden = !a; if (!a) return;
    const ehTexto = a.type === "textbox";
    $(".so-texto", props).style.display = ehTexto ? "" : "none";
    const recolorivel = ehTexto || (a.mc && a.mc.recolorivel);
    propsCores.style.display = recolorivel ? "" : "none";
    propsCores.innerHTML = "";
    if (recolorivel) {
      const grupos = ehTexto ? [["Cor", a.fill]] : [["Cor 1", a.mc.cor1], ["Cor 2", a.mc.cor2]];
      grupos.forEach(([rot, atual], idx) => {
        const wrap = document.createElement("div"); wrap.className = "paleta"; wrap.title = rot;
        CFG.paleta.forEach(hex => {
          const b = document.createElement("button"); b.style.background = hex; b.className = (atual || "").toLowerCase() === hex.toLowerCase() ? "ativa" : "";
          b.onclick = () => { if (ehTexto) a.set("fill", hex); else recolorirSVG(a, idx === 0 ? hex : a.mc.cor1, idx === 1 ? hex : a.mc.cor2); canvas.requestRenderAll(); snapshot(); renderProps(); };
          wrap.appendChild(b);
        });
        const custom = document.createElement("input"); custom.type = "color"; custom.value = /^#[0-9a-f]{6}$/i.test(atual || "") ? atual : "#1d1d1f"; custom.title = rot + " personalizada";
        custom.oninput = () => { if (ehTexto) a.set("fill", custom.value); else recolorirSVG(a, idx === 0 ? custom.value : a.mc.cor1, idx === 1 ? custom.value : a.mc.cor2); canvas.requestRenderAll(); };
        custom.onchange = () => { snapshot(); renderProps(); };
        wrap.appendChild(custom); propsCores.appendChild(wrap);
      });
    }
    if (ehTexto) {
      selFonte.value = a.fontFamily;
      $("#prop-contorno").classList.toggle("ativo", !!a.stroke && a.strokeWidth > 0);
      $("#prop-sombra").classList.toggle("ativo", !!a.shadow);
      $("#prop-arco").classList.toggle("ativo", !!(a.mc && a.mc.arco));
      $("#prop-espaco").value = a.charSpacing || 0;
    }
  }
  canvas.on("selection:created", renderProps); canvas.on("selection:updated", renderProps); canvas.on("selection:cleared", renderProps);
  selFonte.onchange = () => { const a = canvas.getActiveObject(); if (!a || a.type !== "textbox") return; const f = CFG.fontes.find(x => x.nome === selFonte.value); a.set({ fontFamily: f.nome, fontWeight: f.peso || "normal" }); a.initDimensions(); if (a.mc && a.mc.arco) aplicarArco(a, a.mc.arco); canvas.requestRenderAll(); snapshot(); };
  $("#prop-contorno").onclick = () => { const a = canvas.getActiveObject(); if (!a) return; const liga = !(a.stroke && a.strokeWidth > 0); a.set({ stroke: liga ? (luminancia(a.fill) < .5 ? "#ffffff" : "#1d1d1f") : null, strokeWidth: liga ? Math.max(2, a.fontSize * .06) : 0 }); canvas.requestRenderAll(); snapshot(); renderProps(); };
  $("#prop-sombra").onclick = () => { const a = canvas.getActiveObject(); if (!a) return; a.set("shadow", a.shadow ? null : new fabric.Shadow({ color: "rgba(0,0,0,.45)", blur: 0, offsetX: Math.max(3, a.fontSize * .06), offsetY: Math.max(3, a.fontSize * .06) })); canvas.requestRenderAll(); snapshot(); renderProps(); };
  $("#prop-arco").onclick = () => { const a = canvas.getActiveObject(); if (!a || a.type !== "textbox") return; const atual = (a.mc && a.mc.arco) || 0; const prox = atual === 0 ? 0.5 : atual === 0.5 ? -0.5 : 0; aplicarArco(a, prox); snapshot(); renderProps(); };
  $("#prop-espaco").oninput = e => { const a = canvas.getActiveObject(); if (a && a.type === "textbox") { a.set("charSpacing", +e.target.value); canvas.requestRenderAll(); } };
  $("#prop-espaco").onchange = snapshot;
  $("#prop-caixa").onclick = () => { const a = canvas.getActiveObject(); if (!a || a.type !== "textbox") return; const t = a.text; a.set("text", t === t.toUpperCase() ? t.toLowerCase() : t.toUpperCase()); a.initDimensions(); canvas.requestRenderAll(); snapshot(); };
  $("#prop-centrar").onclick = () => { const a = canvas.getActiveObject(); if (!a) return; a.set({ left: AREA.x + AREA.w / 2, originX: "center" }); a.setCoords(); canvas.requestRenderAll(); snapshot(); };
  $("#prop-espelhar").onclick = () => { const a = canvas.getActiveObject(); if (!a) return; a.set("flipX", !a.flipX); canvas.requestRenderAll(); snapshot(); };
  $("#prop-frente").onclick = () => { const a = canvas.getActiveObject(); if (a) { canvas.bringForward(a); snapshot(); } };
  $("#prop-tras").onclick = () => { const a = canvas.getActiveObject(); if (a) { canvas.sendBackwards(a); canvas.sendToBack(guia); snapshot(); } };
  $("#prop-duplicar").onclick = () => { const a = canvas.getActiveObject(); if (!a) return; a.clone(c => { c.set({ left: a.left + 20, top: a.top + 20, mc: a.mc, clipPath: clip }); canvas.add(c); canvas.setActiveObject(c); }, ["mc"]); };
  $("#prop-excluir").onclick = excluirSelecao;
  function excluirSelecao() { const objs = canvas.getActiveObjects(); if (!objs.length) return; canvas.discardActiveObject(); objs.forEach(o => canvas.remove(o)); canvas.requestRenderAll(); }
  document.addEventListener("keydown", e => {
    const edt = canvas.getActiveObject() && canvas.getActiveObject().isEditing;
    if (edt || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); excluirSelecao(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? refazer() : desfazer(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); refazer(); }
    const a = canvas.getActiveObject(); if (a && /^Arrow/.test(e.key)) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; a.set({ left: a.left + (e.key === "ArrowRight" ? d : e.key === "ArrowLeft" ? -d : 0), top: a.top + (e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0) }); a.setCoords(); canvas.requestRenderAll(); }
  });
  $("#btn-desfazer").onclick = desfazer; $("#btn-refazer").onclick = refazer;
  $("#btn-limpar").onclick = () => { if (confirm("Limpar tudo deste lado?")) { canvas.getObjects().filter(o => o.name !== "guia").forEach(o => canvas.remove(o)); } };

  // Aviso de área
  function checarArea() {
    const fora = canvas.getObjects().some(o => {
      if (o.name === "guia") return false; const b = o.getBoundingRect(true, true);
      return b.left < AREA.x - 2 || b.top < AREA.y - 2 || b.left + b.width > AREA.x + AREA.w + 2 || b.top + b.height > AREA.y + AREA.h + 2;
    });
    $("#aviso-area").hidden = !fora;
  }
  canvas.on("object:moving", checarArea); canvas.on("object:scaling", checarArea);

  // ---------- Lados ----------
  function renderLados() {
    const box = $("#lados"); box.innerHTML = "";
    PROD.lados.forEach((l, i) => {
      const b = document.createElement("button"); b.className = "lado" + (l.slug === estado.lado ? " ativo" : ""); b.dataset.lado = l.slug;
      b.innerHTML = `${l.nome}${l.extra_brl && !CFG.gratis ? ` <small>+${brl(l.extra_brl)}</small>` : ""}${ladoTemArte(l.slug) && l.slug !== estado.lado ? '<span class="tem"></span>' : ""}`;
      b.onclick = () => trocarLado(l.slug); box.appendChild(b);
    });
  }
  async function trocarLado(lado) {
    if (lado === estado.lado) return;
    estado.artes[estado.lado] = serializar();
    estado.lado = lado;
    await carregarJSON(estado.artes[lado]);
    if (!histDe(lado).length) histDe(lado).push(estado.artes[lado] || '{"objects":[]}');
    renderLados();
  }
  const ladoTemArte = lado => { try { if (lado === estado.lado) return canvas.getObjects().some(o => o.name !== "guia"); const j = JSON.parse(estado.artes[lado] || "{}"); return (j.objects || []).some(o => o.name !== "guia"); } catch { return false; } };
  const ladosComArte = () => PROD.lados.map(l => l.slug).filter(ladoTemArte);

  // ---------- Produto: seleção, cor, modelagem, tamanho, qtd, preço ----------
  function recontrastar(antigaCor) {
    // Objetos que estavam na cor "automática" (contraste com a peça) acompanham a nova cor.
    const antes = luminancia(antigaCor) < 0.45 ? "#ffffff" : "#1d1d1f";
    const agora = corContraste();
    if (antes === agora) return;
    const igual = (a, b) => (a || "").toLowerCase() === b.toLowerCase();
    canvas.getObjects().forEach(o => {
      if (o.name === "guia") return;
      if (o.type === "textbox" && igual(o.fill, antes)) o.set("fill", agora);
      else if (o.mc && o.mc.recolorivel) {
        const c1 = igual(o.mc.cor1, antes) ? agora : o.mc.cor1;
        const c2 = igual(o.mc.cor2, antes) ? agora : o.mc.cor2;
        if (c1 !== o.mc.cor1 || c2 !== o.mc.cor2) recolorirSVG(o, c1, c2);
      }
    });
    Object.keys(estado.artes).forEach(lado => {
      if (lado === estado.lado || !estado.artes[lado]) return;
      try {
        const j = JSON.parse(estado.artes[lado]);
        (j.objects || []).forEach(o => {
          if (o.type === "textbox" && igual(o.fill, antes)) o.fill = agora;
          if (o.mc && o.mc.recolorivel) {
            const trocar = objs => objs.forEach(x => { ["fill", "stroke"].forEach(p => { if (igual(x[p], o.mc.cor1) && igual(o.mc.cor1, antes)) x[p] = agora; }); });
            trocar(o.objects || [o]); if (igual(o.mc.cor1, antes)) o.mc.cor1 = agora; if (igual(o.mc.cor2, antes)) o.mc.cor2 = agora;
          }
        });
        estado.artes[lado] = JSON.stringify(j);
      } catch { /* ignora */ }
    });
    canvas.requestRenderAll();
  }
  function renderOpcoesProduto() {
    $("#prod-nome").textContent = PROD.nome; $("#prod-desc").textContent = PROD.descricao; $("#preco-rotulo").textContent = PROD.nome;
    $$("#produtos .prod").forEach(b => b.classList.toggle("ativo", b.dataset.slug === PROD.slug));
    ajustarEscolhas();
    const cores = $("#cores-camisa"); cores.innerHTML = "";
    coresAtuais().forEach(c => {
      const b = document.createElement("button"); b.className = "cor" + (c.slug === estado.cor.slug ? " ativa" : ""); b.dataset.slug = c.slug; b.title = c.nome; b.style.setProperty("--c", c.hex);
      b.onclick = async () => {
        $$("#cores-camisa .cor").forEach(x => x.classList.toggle("ativa", x === b));
        const antiga = estado.cor.hex; estado.cor = c; $("#cor-nome").textContent = c.nome;
        await desenharProduto(); recontrastar(antiga); snapshot(); salvarRascunho();
      };
      cores.appendChild(b);
    });
    $("#cor-nome").textContent = estado.cor.nome;
    const mods = $("#modelagens"); mods.innerHTML = ""; $("#opcao-modelagem").hidden = PROD.modelagens.length < 2;
    PROD.modelagens.forEach(m => {
      const b = document.createElement("button"); b.className = m.slug === estado.modelagem ? "ativo" : ""; b.textContent = m.nome;
      b.onclick = async () => { const corAntiga = estado.cor.hex; estado.modelagem = m.slug; renderOpcoesProduto(); await desenharProduto(); if (corAntiga !== estado.cor.hex) recontrastar(corAntiga); atualizarPreco(); salvarRascunho(); };
      mods.appendChild(b);
    });
    const tams = $("#tamanhos"); tams.innerHTML = "";
    tamanhosAtuais().forEach(t => {
      const b = document.createElement("button"); b.className = t === estado.tamanho ? "ativo" : ""; b.textContent = t;
      b.onclick = () => { $$("#tamanhos button").forEach(x => x.classList.toggle("ativo", x === b)); estado.tamanho = t; atualizarPreco(); salvarRascunho(); };
      tams.appendChild(b);
    });
    renderLados();
  }
  // Uma modelagem pode restringir cores/tamanhos (ex.: babylook sem XGG) — espelhado em worker/src/precos.js
  const modAtual = () => PROD.modelagens.find(m => m.slug === estado.modelagem) || PROD.modelagens[0];
  const coresAtuais = () => modAtual().cores ? PROD.cores.filter(c => modAtual().cores.includes(c.slug)) : PROD.cores;
  const tamanhosAtuais = () => modAtual().tamanhos || PROD.tamanhos;
  function ajustarEscolhas() {
    const cores = coresAtuais(), tams = tamanhosAtuais();
    if (!cores.some(c => c.slug === estado.cor.slug)) estado.cor = cores[0];
    if (!tams.includes(estado.tamanho)) estado.tamanho = tams.includes("M") ? "M" : tams[0];
  }
  async function trocarProduto(slug, manterArtes = true) {
    const novo = CFG.produtos.find(p => p.slug === slug); if (!novo || novo.slug === PROD.slug) return;
    estado.artes[estado.lado] = serializar();
    const artesAntigas = estado.artes;
    PROD = novo; estado.produto = slug;
    estado.cor = PROD.cores.find(c => c.slug === estado.cor.slug) || PROD.cores[0];
    estado.modelagem = PROD.modelagens.find(m => m.slug === estado.modelagem) ? estado.modelagem : PROD.modelagens[0].slug;
    estado.tamanho = PROD.tamanhos.includes(estado.tamanho) ? estado.tamanho : (PROD.tamanhos.includes("M") ? "M" : PROD.tamanhos[0]);
    // mantém a arte dos lados com o mesmo slug (frente→frente, costas→costas); os demais recomeçam
    estado.artes = {}; estado.historico = {}; estado.futuro = {};
    if (manterArtes) PROD.lados.forEach(l => { if (artesAntigas[l.slug]) estado.artes[l.slug] = artesAntigas[l.slug]; });
    estado.lado = PROD.lados[0].slug;
    renderOpcoesProduto();
    await carregarJSON(estado.artes[estado.lado]);
    histDe(estado.lado).push(estado.artes[estado.lado] || '{"objects":[]}');
    renderLados(); salvarRascunho();
    toast(`${PROD.nome} selecionad${PROD.nome.endsWith("a") ? "a" : "o"}. Área de impressão: ${ladoAtual().area_cm[0]}×${ladoAtual().area_cm[1]} cm.`);
  }
  $$("#produtos .prod").forEach(b => b.onclick = () => trocarProduto(b.dataset.slug));
  const inpQtd = $("#qtd");
  $("#qtd-menos").onclick = () => { inpQtd.value = Math.max(1, +inpQtd.value - 1); inpQtd.dispatchEvent(new Event("change")); };
  $("#qtd-mais").onclick = () => { inpQtd.value = Math.min(20, +inpQtd.value + 1); inpQtd.dispatchEvent(new Event("change")); };
  inpQtd.onchange = () => { estado.qtd = Math.min(20, Math.max(1, +inpQtd.value || 1)); inpQtd.value = estado.qtd; atualizarPreco(); salvarRascunho(); };
  $("#link-medidas").onclick = e => { e.preventDefault(); $("#dlg-medidas").showModal(); };

  function extrasAtivos() {
    // o primeiro lado está incluso; qualquer outro lado com arte cobra extra (se só houver arte em um lado não-incluso, ele vira o incluso)
    const com = ladosComArte(); if (com.length <= 1) return [];
    const inclui = com.includes(PROD.lados[0].slug) ? PROD.lados[0].slug : com[0];
    return PROD.lados.filter(l => com.includes(l.slug) && l.slug !== inclui && l.extra_brl);
  }
  function precoUnitario() {
    const base = estado.tamanho === "XGG" ? PROD.preco_xgg_brl : PROD.preco_brl;
    return base + extrasAtivos().reduce((a, l) => a + l.extra_brl, 0);
  }
  function atualizarPreco() {
    const base = estado.tamanho === "XGG" ? PROD.preco_xgg_brl : PROD.preco_brl;
    $("#preco-base").textContent = brl(base) + (estado.qtd > 1 ? ` × ${estado.qtd}` : "");
    $("#linhas-extras").innerHTML = extrasAtivos().map(l => `<div class="linha"><span>Estampa ${l.nome.toLowerCase()}</span><span>+ ${brl(l.extra_brl)}</span></div>`).join("");
    $("#preco-total").textContent = brl(precoUnitario() * estado.qtd);
    renderLados();
  }

  // ---------- Rascunho ----------
  function salvarRascunho() {
    try {
      estado.artes[estado.lado] = serializar();
      localStorage.setItem("mc_rascunho", JSON.stringify({ v: 2, produto: PROD.slug, lado: estado.lado, cor: estado.cor.slug, modelagem: estado.modelagem, tamanho: estado.tamanho, qtd: estado.qtd, artes: estado.artes, t: Date.now() }));
    } catch (e) { /* imagens grandes podem estourar o localStorage; ignorar */ }
  }
  function restaurarRascunho() {
    try {
      const r = JSON.parse(localStorage.getItem("mc_rascunho") || "null"); if (!r || r.v !== 2 || Date.now() - r.t > 7 * 864e5) return false;
      PROD = CFG.produtos.find(p => p.slug === r.produto) || PROD; estado.produto = PROD.slug;
      estado.cor = PROD.cores.find(c => c.slug === r.cor) || PROD.cores[0]; estado.modelagem = PROD.modelagens.find(m => m.slug === r.modelagem) ? r.modelagem : PROD.modelagens[0].slug;
      estado.tamanho = PROD.tamanhos.includes(r.tamanho) ? r.tamanho : PROD.tamanhos[0]; estado.qtd = r.qtd || 1;
      estado.artes = r.artes || {}; estado.lado = PROD.lados.find(l => l.slug === r.lado) ? r.lado : PROD.lados[0].slug;
      inpQtd.value = estado.qtd;
      return Object.values(estado.artes).some(Boolean);
    } catch { return false; }
  }

  // ---------- Exportação ----------
  function exportarLado(lado, escala) {
    // retorna dataURL PNG só da área de impressão, fundo transparente, em 300 dpi (escala por lado)
    const atual = estado.lado;
    const render = () => {
      escala = escala || AREA.escala;
      const bg = canvas.backgroundImage, ov = canvas.overlayImage; canvas.backgroundImage = null; canvas.overlayImage = null; guia.visible = false;
      const sel = canvas.getActiveObject(); canvas.discardActiveObject();
      const url = canvas.toDataURL({ format: "png", left: AREA.x, top: AREA.y, width: AREA.w, height: AREA.h, multiplier: escala });
      canvas.backgroundImage = bg; canvas.overlayImage = ov; guia.visible = true; if (sel) canvas.setActiveObject(sel); canvas.requestRenderAll();
      return url;
    };
    if (lado === atual) return Promise.resolve(render());
    return (async () => { await trocarLado(lado); const u = render(); await trocarLado(atual); return u; })();
  }
  function mockup(transparente = false) {
    guia.visible = false; canvas.discardActiveObject();
    const bg = canvas.backgroundColor; canvas.backgroundColor = transparente ? "transparent" : "#16161d";
    const url = canvas.toDataURL({ format: "png", multiplier: 1.5 });
    canvas.backgroundColor = bg; guia.visible = true; canvas.requestRenderAll(); return url;
  }
  // ---------- Visualizar ----------
  async function mockupLado(lado, transparente = false) {
    const atual = estado.lado;
    if (lado === atual) return mockup(transparente);
    await trocarLado(lado); const u = mockup(transparente); await trocarLado(atual); return u;
  }
  async function abrirPreview() {
    const dlgP = $("#dlg-preview");
    dlgP.showModal();
    const modo = $$(".preview-modos button").find(b => b.classList.contains("ativo")).dataset.modo;
    await mostrarPreview(modo);
  }
  let _cenaIdx = 0, _mockups = {};
  async function mostrarPreview(modo) {
    $$(".preview-modos button").forEach(b => b.classList.toggle("ativo", b.dataset.modo === modo));
    $("#preview-3d").hidden = modo !== "3d"; $("#preview-grid").hidden = modo !== "lados";
    $("#preview-info").textContent = CFG.gratis ? `${PROD.nome} · ${estado.cor.nome}`
      : `${PROD.nome} · ${PROD.modelagens.find(m => m.slug === estado.modelagem).nome} · ${estado.cor.nome} · Tam. ${estado.tamanho} · ${brl(precoUnitario())}${estado.qtd > 1 ? ` × ${estado.qtd}` : ""}`;
    // mockups vetoriais por lado (cache por abertura)
    const lados = PROD.lados.filter(l => ladoTemArte(l.slug) || l.slug === PROD.lados[0].slug).map(l => l.slug);
    for (const l of lados) if (!_mockups[l]) _mockups[l] = await mockupLado(l);
    $("#dlg-preview").dataset.frente = _mockups[lados[0]];
    if (modo === "lados") {
      const nomeDe = sl => PROD.lados.find(l => l.slug === sl).nome;
      $("#preview-grid").innerHTML = lados.map(l => `<figure class="${lados.length > 1 ? "" : "unico"}"><img src="${_mockups[l]}" alt="${PROD.nome} ${nomeDe(l)}"><figcaption>${nomeDe(l)}${!ladoTemArte(l) ? " (sem estampa)" : ""}</figcaption></figure>`).join("");
    } else if (modo === "3d") {
      const costasSlug = PROD.lados.find(l => l.vista === "costas")?.slug;
      const f = _mockups["t:" + PROD.lados[0].slug] || (_mockups["t:" + PROD.lados[0].slug] = await mockupLado(PROD.lados[0].slug, true));
      const c = costasSlug ? (_mockups["t:" + costasSlug] || (_mockups["t:" + costasSlug] = await mockupLado(costasSlug, true))) : f;
      $("#peca3d .frente").src = f; $("#peca3d .costas").src = c;
      girar(+$("#giro").value);
    }
  }
  function girar(ang) {
    const el = $("#peca3d"); el.style.transform = `rotateY(${ang}deg)`;
    const atras = ((ang % 360) + 360) % 360 > 90 && ((ang % 360) + 360) % 360 < 270;
    el.classList.toggle("ver-costas", atras);
  }
  $("#giro").addEventListener("input", e => girar(+e.target.value));
  (() => { // arrastar para girar
    const cena = $(".cena3d"); let down = false, x0 = 0, a0 = 0;
    cena.addEventListener("pointerdown", e => { down = true; x0 = e.clientX; a0 = +$("#giro").value; cena.setPointerCapture(e.pointerId); });
    cena.addEventListener("pointermove", e => { if (!down) return; const a = (a0 + (e.clientX - x0) * 0.8 + 360) % 360; $("#giro").value = a; girar(a); });
    cena.addEventListener("pointerup", () => down = false); cena.addEventListener("pointercancel", () => down = false);
  })();
  $$(".preview-modos button").forEach(b => b.onclick = () => mostrarPreview(b.dataset.modo));
  $("#dlg-preview").addEventListener("close", () => { _mockups = {}; });
  $("#btn-visualizar").onclick = abrirPreview;
  $("#btn-preview-comprar").onclick = () => { $("#dlg-preview").close(); $("#btn-comprar").click(); };
  const imgPreviewAtual = () => $("#dlg-preview").dataset.frente;
  $("#btn-preview-baixar").onclick = () => { const a = document.createElement("a"); a.href = imgPreviewAtual(); a.download = "minha-peca-montacamisa.png"; a.click(); };
  $("#btn-preview-compartilhar").onclick = async () => {
    const url = imgPreviewAtual();
    try {
      const blob = await (await fetch(url)).blob(); const file = new File([blob], "minha-camiseta.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Minha camiseta na Monta Camisa", text: "Olha a camiseta que eu montei: montacamisa.com.br" }); return; }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("Imagem copiada! Cole no WhatsApp ou Instagram.");
    } catch { toast("Seu navegador não permite compartilhar direto — use “Salvar imagem”."); }
  };

  // ---------- Checkout ----------
  const dlg = $("#dlg-checkout"), form = $("#form-checkout"), msg = $("#checkout-msg");
  let frete = null;
  $("#btn-comprar").onclick = () => {
    if (!ladosComArte().length) return toast("Adicione um texto ou estampa antes de comprar 🙂");
    if (!CFG.worker_url) return toast("Loja em fase final de testes — pagamento abre em breve. Baixe a prévia e guarde sua ideia!", 6000);
    $("#resumo-pedido").innerHTML = `<img src="${mockup()}" alt=""><div><b>${PROD.nome} · ${PROD.modelagens.find(m => m.slug === estado.modelagem).nome}</b><br>${estado.cor.nome} · Tam. ${estado.tamanho} · ${estado.qtd} un.<br>Estampa: ${ladosComArte().map(l => PROD.lados.find(x => x.slug === l).nome).join(" + ")}<br><strong>${brl(precoUnitario() * estado.qtd)}</strong> + frete</div>`;
    if (form.cep.value.replace(/\D/g, "").length === 8) cotarFrete(form.cep.value); // recota: quantidade pode ter mudado
    dlg.showModal();
  };
  $("#btn-fechar-checkout").onclick = () => dlg.close();
  // máscaras simples
  form.cpf.oninput = e => e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  form.cep.oninput = e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); if (e.target.value.length === 9) buscarCEP(e.target.value); };
  form.telefone.oninput = e => e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  async function buscarCEP(cep) {
    const c = cep.replace(/\D/g, "");
    try {
      const d = await fetch(`https://viacep.com.br/ws/${c}/json/`).then(r => r.json());
      if (d.erro) throw 0;
      form.logradouro.value = d.logradouro || ""; form.bairro.value = d.bairro || ""; form.cidade.value = d.localidade; form.uf.value = d.uf;
      form.numero.focus(); cotarFrete(c);
    } catch { msg.textContent = "CEP não encontrado. Confira e tente de novo."; }
  }
  async function cotarFrete(cep) {
    const box = $("#frete-box"); box.innerHTML = "Calculando frete…"; frete = null;
    try {
      const r = await fetch(`${CFG.worker_url}/frete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cep, quantidade: estado.qtd, subtotal: precoUnitario() * estado.qtd }) }).then(r => r.json());
      if (!r.opcoes || !r.opcoes.length) throw 0;
      box.innerHTML = r.opcoes.map((o, i) => `<label class="opcao-frete"><input type="radio" name="frete" value="${i}" ${i === 0 ? "checked" : ""}><span>${o.nome}</span><span>${o.prazo} dias úteis</span><strong>${o.valor === 0 ? "Grátis" : brl(o.valor)}</strong></label>`).join("");
      frete = r.opcoes;
    } catch { box.innerHTML = "<span class='erro'>Não foi possível calcular o frete agora. Tente de novo em instantes.</span>"; }
  }
  form.onsubmit = async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const idx = +(form.querySelector("input[name=frete]:checked") || {}).value; if (!frete || isNaN(idx)) return (msg.textContent = "Selecione uma opção de frete.");
    $("#btn-pagar").disabled = true; msg.textContent = "Preparando sua arte em alta resolução…";
    try {
      const artes = {};
      for (const lado of ladosComArte()) artes[lado] = await exportarLado(lado, areaDe(lado).escala);
      const fd = new FormData(form);
      const pedido = {
        produto: PROD.slug, tipo: PROD.tipo, modelagem: estado.modelagem, cor: estado.cor.slug, tamanho: estado.tamanho, quantidade: estado.qtd,
        lados: Object.fromEntries(ladosComArte().map(l => [l, areaDe(l).px])),
        frete: frete[idx], cliente: Object.fromEntries(fd.entries()), mockup: mockup(), artes,
        preco_unitario: precoUnitario(), origem: location.href,
      };
      delete pedido.cliente.frete; delete pedido.cliente.aceite;
      msg.textContent = "Enviando pedido…";
      const r = await fetch(`${CFG.worker_url}/pedido`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) }).then(r => r.json());
      if (!r.pagamento_url) throw new Error(r.erro || "sem url");
      localStorage.setItem("mc_ultimo_pedido", r.pedido_id);
      msg.textContent = "Redirecionando para o pagamento…"; location.href = r.pagamento_url;
    } catch (err) { msg.textContent = "Não conseguimos criar o pedido: " + (err.message || err) + ". Tente novamente ou fale com a gente."; $("#btn-pagar").disabled = false; }
  };

  // ---------- Toast ----------
  let toastT; function toast(txt, ms = 3500) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); } t.textContent = txt; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms); }

  // ---------- Início ----------
  const temRascunho = restaurarRascunho();
  if (params.has("produto") && !temRascunho) { const pr = CFG.produtos.find(p => p.slug === params.get("produto")); if (pr) { PROD = pr; estado.produto = pr.slug; estado.cor = pr.cores[0]; estado.modelagem = pr.modelagens[0].slug; estado.tamanho = pr.tamanhos.includes("M") ? "M" : pr.tamanhos[0]; estado.lado = pr.lados[0].slug; } }
  renderOpcoesProduto();
  await Promise.all(CFG.fontes.map(f => document.fonts.load(`${f.peso || 400} 40px '${f.nome}'`).catch(() => {})));
  await carregarJSON(estado.artes[estado.lado]);
  histDe(estado.lado).push(estado.artes[estado.lado] || '{"objects":[]}');
  renderLados();
  if (temRascunho) toast("Recuperamos seu rascunho anterior 🙂");
  else if (!params.has("modelo") && !params.has("frase") && !params.has("estampa")) aplicarModelo(CFG.modelos[0]);
  if (params.has("estampa")) { const it = ACERVO.estampas.find(e => e.id === params.get("estampa")); if (it) novoSVG(it.a, { tipo: it.t === "elemento" ? "elemento" : "estampa", w: it.t === "elemento" ? 0.9 : 0.45 }); }
  miniaturasModelos();
  redimensionar(); setTimeout(redimensionar, 300);
  // ---------- Modo grátis: baixar em vez de comprar ----------
  if (CFG.gratis) {
    const baixar = (href, nome) => { const a = document.createElement("a"); a.href = href; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); };
    const ev = (a) => { try { window.mcEvento && window.mcEvento("baixar", a); } catch (_) {} };
    $("#btn-baixar-arte").onclick = async () => {
      const lados = ladosComArte();
      if (!lados.length) return toast("Adicione um texto ou estampa antes de baixar 🙂");
      for (const l of lados) baixar(await exportarLado(l), `arte-${PROD.slug}-${l}-montacamisa.png`);
      toast(lados.length > 1 ? `${lados.length} arquivos baixados, um por lado da peça.` : "Arte baixada em PNG 300 dpi, com fundo transparente.");
      ev("editor-arte");
    };
    $("#btn-preview-comprar").onclick = () => { $("#dlg-preview").close(); $("#btn-baixar-arte").click(); };
    $("#btn-baixar-mockup").onclick = () => { baixar(mockup(), `mockup-${PROD.slug}-montacamisa.png`); ev("editor-mockup"); };
  }
  window.MC = { canvas, estado, exportarLado, aplicarModelo, novoTexto, novoSVG, trocarProduto, trocarLado, mockup, get PROD() { return PROD; } }; // para depuração/testes
})();
