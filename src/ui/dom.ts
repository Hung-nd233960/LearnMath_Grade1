// Tiny DOM helpers. No framework: screens are built with h() and removed by their cleanup.

/** Remove everything a screen created; returned by mount() functions. */
export type Cleanup = () => void;

export type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined | ((e: Event) => void);
export type Attrs = Record<string, AttrValue>;

/**
 * Create an element. Attribute rules:
 * - "class" sets the class list; a function value on an "onxxx" key adds that event listener;
 * - true sets an empty attribute; false / null / undefined skip it; "style" takes a string.
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === "function") el.addEventListener(key.replace(/^on/, ""), value);
    else if (key === "class") el.className = String(value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  append(el, ...children);
  return el;
}

export function append(parent: ParentNode, ...children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    parent.append(typeof c === "number" ? String(c) : c);
  }
}

/** Build an element from STATIC trusted markup (our own SVG/HTML strings, never user text). */
export function html(markup: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
}

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(sel)];

/** Resolve after `ms` milliseconds (used for short pauses in animations). */
export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function clear(el: Element): void {
  el.replaceChildren();
}

/** URL of a Fluent Emoji (public/assets/emoji/<name>_3d.png). Works with Vite's relative base. */
export function emojiSrc(name: string): string {
  return `${import.meta.env.BASE_URL}assets/emoji/${name}_3d.png`;
}

export function emoji(name: string, size: number, className = ""): HTMLImageElement {
  return h("img", { class: `emo ${className}`.trim(), src: emojiSrc(name), width: size, height: size, alt: "" });
}
