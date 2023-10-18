import { WerkvoorraadItem } from "https://uu-asc.github.io/csa-werkvoorraad/src/werkvoorraad-item.js"

export class WerkvoorraadHoofdstuk extends HTMLElement {
    static observedAttributes = ["open", "show-empty"]

    constructor(id, label, items) {
        super()
        this.id = id
        this.label = label
        this.items = items
        this.shadow = this.attachShadow({ mode: 'open' })
        this.handleToggle = this.handleToggle.bind(this)
    }

    get _details() { return this.shadow.querySelector("details") }
    get _items() { return this.shadow.querySelectorAll("werkvoorraad-item") }

    connectedCallback() {
        this.shadow.innerHTML = this.render()
        this.populate()
        this._details.addEventListener("toggle", this.handleToggle)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        const attrWasAdded = this.hasAttribute(name)
        switch (name) {
            case "open":
                attrWasAdded
                ? this._details.setAttribute("open", "")
                : this._details.removeAttribute("open")
                const event = new CustomEvent("toggle", {
                    composed: true,
                    bubbles: true,
                    detail: { isOpen: attrWasAdded }
                })
                this.dispatchEvent(event)
                break

            case "show-empty":
                attrWasAdded
                ? this._items.forEach(item => item.setAttribute("show-empty", ""))
                : this._items.forEach(item => item.removeAttribute("show-empty"))
                break

            default:
                return
        }
    }

    handleOpen() { this.setAttribute("open", "") }
    handleClose() { this.removeAttribute("open") }
    handleToggle() { this._details.open ? this.handleOpen() : this.handleClose() }

    render() {
        const totals = {}
        this.items.forEach(item => {
            Object.entries(item.data).forEach(([key, arr]) => {
                totals[key] = (totals[key] ?? 0) + arr.length
            })
        })
        const label = Object.entries(totals)
            .map(([key, n]) => `${key}: ${n}`)
            .join(', ')
        const n = Object.values(totals).reduce((sum, arr) => sum + arr.length, 0)

        return `<style>${style}</style>
        <section${n < 1 ? ' class="empty"' : ""}>
            <details>
                <summary>
                    <h2>${this.label}</h2>
                    <code>(${label})</code>
                </summary>
            </details>
        </section>`
    }

    populate() {
        this.items.forEach(item => {
            const element = new WerkvoorraadItem(item)
            element.batchSize = 10
            this._details.appendChild(element)
        })
    }
}

customElements.define("werkvoorraad-hoofdstuk", WerkvoorraadHoofdstuk)
