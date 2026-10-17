// Shared SVG gradients: the brass scale, wood, and the ceramic vase all reference these by id
// (fill="url(#brass)"). Injected once into <body>.
const ID = "ttth-defs";

export function ensureSvgDefs(): void {
  if (document.getElementById(ID)) return;
  document.body.insertAdjacentHTML("afterbegin", `<svg id="${ID}" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f2b544"/><stop offset="1" stop-color="#c98a1e"/></linearGradient>
    <linearGradient id="brassV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a1e"/><stop offset=".38" stop-color="#ffe08a"/><stop offset="1" stop-color="#c98a1e"/></linearGradient>
    <linearGradient id="bowlG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe59a"/><stop offset="1" stop-color="#e3a234"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4f"/><stop offset="1" stop-color="#9a5f2c"/></linearGradient>
    <radialGradient id="ceramic" cx=".36" cy=".42" r=".75"><stop offset="0" stop-color="#9be6f2"/><stop offset=".5" stop-color="#46acd0"/><stop offset="1" stop-color="#25729a"/></radialGradient>
  </defs></svg>`);
}
