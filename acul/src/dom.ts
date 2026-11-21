// Tiny DOM helpers: the login screens are small enough that a framework
// would only add weight to every Universal Login page load.

type Child = Node | string | null | undefined | false
type Attrs = Record<string, string | boolean | ((e: Event) => void) | undefined>

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Array<Child | Array<Child>>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue
    if (typeof value === "function") el.addEventListener(key.replace(/^on/, "").toLowerCase(), value)
    else if (value === true) el.setAttribute(key, "")
    else el.setAttribute(key, value)
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    el.append(typeof child === "string" ? document.createTextNode(child) : child)
  }
  return el
}

const BOLT_PATH = "M14 74 L64 20 L58 46 L90 38 L38 90 L44 64 Z"

export function logo(): HTMLElement {
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 100 100")
  svg.setAttribute("width", "34")
  svg.setAttribute("height", "34")
  svg.setAttribute("aria-hidden", "true")
  const path = document.createElementNS(ns, "path")
  path.setAttribute("d", BOLT_PATH)
  path.setAttribute("fill", "currentColor")
  svg.append(path)
  const wrap = h("span", { class: "k-logo" }, h("span", { class: "k-sr" }, "KINETIK"))
  wrap.prepend(svg)
  wrap.append(h("span", { "aria-hidden": "true" }, "KINETIK"))
  return wrap
}

export function googleIcon(): SVGElement {
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 48 48")
  svg.setAttribute("width", "20")
  svg.setAttribute("height", "20")
  svg.setAttribute("aria-hidden", "true")
  const paths: Array<[string, string]> = [
    ["#FFC107", "M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"],
    ["#FF3D00", "M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"],
    ["#4CAF50", "M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"],
    ["#1976D2", "M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"],
  ]
  for (const [fill, d] of paths) {
    const p = document.createElementNS(ns, "path")
    p.setAttribute("fill", fill)
    p.setAttribute("d", d)
    svg.append(p)
  }
  return svg
}
