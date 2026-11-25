import "./styles.css"
import { screens } from "./screens.ts"
import { shell } from "./ui.ts"
import { h } from "./dom.ts"

declare global {
  interface Window {
    universal_login_context?: { screen?: { name?: string } }
  }
}

function mount() {
  const name = window.universal_login_context?.screen?.name ?? ""
  const render = screens[name]
  let content: HTMLElement
  try {
    content = render
      ? render()
      : h("div", {}, h("h1", { class: "k-title" }, "Something went wrong"), h("p", { class: "k-sub" }, `Unsupported screen: ${name}`))
  } catch (err) {
    console.error(err)
    content = h("div", {}, h("h1", { class: "k-title" }, "Something went wrong"), h("p", { class: "k-sub" }, "Please go back and try again."))
  }
  document.body.classList.add("kinetik")
  document.body.replaceChildren(shell(content))
  // Autofocus on desktop only, so phones don't pop the keyboard over the page.
  if (window.matchMedia("(min-width: 960px)").matches) {
    document.querySelector<HTMLInputElement>(".k-form input:not([type=hidden]):not([readonly])")?.focus({ preventScroll: true })
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount)
else mount()
