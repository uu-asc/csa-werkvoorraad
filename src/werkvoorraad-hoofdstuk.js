import { WerkvoorraadItem } from "https://uu-asc.github.io/csa-werkvoorraad/src/werkvoorraad-item.js"

const style =
`*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
}

/* LAYOUT */
summary {
    border-top: 4px solid;
    min-width: 200px;
    padding: 0.5em 0;
    position: relative;
    cursor: pointer;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .5em;
}

summary code {
    flex-grow: 1;
}
summary :last-child {
    margin-right: 2ch;
}

summary:after {
    content: "+";
    position: absolute;
    font-size: 1.75em;
    right: 0;
    font-weight: 200;
    transform-origin: center;
    transition: 40ms linear;
}
details[open] > summary:after {
    transform: rotate(45deg);
}

/* STYLING */
h2, h3, h4, h5, h6 {
    font-variant: small-caps;
}

/* UTILITY */
.empty {
    display: none;
}
:host([show-empty]) .empty {
    display: block;
}`

export class WerkvoorraadHoofdstuk extends HTMLElement {
    static observedAttributes = ["open", "show-empty"]
    config = {
        clipboardWriteLabel: "naar klembord gekopieerd!",
    }

    constructor(spec, config={}, depth=0) {
        super()
        this.id = spec.id
        this.depth = depth
        this.label = spec.label
        this.config = { ...this.config, ...config }
        this.shadow = this.attachShadow({ mode: 'open' })

        this.handleToggle = this.handleToggle.bind(this)
        this.loadFromSpec = this.loadFromSpec.bind(this)

        this.items = spec.items.map(this.loadFromSpec)
    }

    get totals() {
        const totals = {}
        for (const item of this.items) {
            const isChapter = item instanceof WerkvoorraadHoofdstuk
            const source = isChapter ? item.totals : item.data
            for (const [key, val] of Object.entries(source)) {
                const n = Array.isArray(val) ? val.length : val
                totals[key] = (totals[key] ?? 0) + n
            }
        }
        return totals
    }

    get _details() { return this.shadow.querySelector("details") }
    get _display() { return this.shadow.querySelector("summary div") }

    connectedCallback() {
        this.render()
        this._details.addEventListener("toggle", this.handleToggle)
        this.addEventListener("clipboardWriteEvent", event => {
            event.stopPropagation()
            this._display.innerHTML = this.config.clipboardWriteLabel
            setTimeout(() => { this._display.innerHTML = "" }, 1000)
        })
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
                ? this.items.forEach(item => item.setAttribute("show-empty", ""))
                : this.items.forEach(item => item.removeAttribute("show-empty"))
                break

            default:
                return
        }
    }

    handleOpen() { this.setAttribute("open", "") }
    handleClose() { this.removeAttribute("open") }
    handleToggle() {
        const isOpen = this._details.open
        isOpen ? this.handleOpen() : this.handleClose()

        const toggleState = this.getToggleStateFromLocalStorage()
        toggleState[this.id] = isOpen
        localStorage.setItem("toggleState", JSON.stringify(toggleState))
    }

    getToggleStateFromLocalStorage() {
        const json = localStorage.getItem("toggleState")
        return JSON.parse(json) ?? {}
    }

    render() {
        const totals =
            Object.entries(this.totals)
            .map(([key, n]) => `${key}: ${n}`)
            .join(', ')
        const n = Object.values(this.totals).reduce((sum, val) => sum + val, 0)

        this.shadow.innerHTML =
            `<style>${style}</style>
            <section${n < 1 ? ' class="empty"' : ""}>
                <details>
                    <summary>
                        <h${2 + this.depth}>${this.label}</h2>
                        <code>(${totals})</code>
                        <div></div>
                    </summary>
                </details>
            </section>`
        this.items.forEach(item => (this._details.appendChild(item)))

        const toggleState = this.getToggleStateFromLocalStorage()
        const isOpen = toggleState[this.id] ? true : false
        this._details.open = isOpen
    }

    loadFromSpec(spec) {
        const element = spec.type === "hoofdstuk"
        ? new WerkvoorraadHoofdstuk(spec, this.config, this.depth + 1)
        : new WerkvoorraadItem(spec, this.config)
        return element
    }
}

customElements.define("werkvoorraad-hoofdstuk", WerkvoorraadHoofdstuk)
