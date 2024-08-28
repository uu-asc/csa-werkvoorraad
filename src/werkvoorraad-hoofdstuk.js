import { WerkvoorraadItem } from "./werkvoorraad-item.js"

const style =
`/* CSS FOR HOOFDSTUK */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
}

/* layout */
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

/* styling */
h2, h3, h4, h5, h6 {
    font-variant: small-caps;
}

/* utility */
.empty, .hide {
    display: none;
}
:host([show-empty]) .empty {
    display: block;
}`

export class WerkvoorraadHoofdstuk extends HTMLElement {
    static observedAttributes = ["open", "show-empty"]
    config = {
        clipboardWriteLabel: "gekopieerd!",
        offset: .5,
    }

    constructor(spec, config={}, depth=0) {
        super()
        this.id = spec.id
        this.depth = depth
        this.label = spec.label
        this.config = { ...this.config, ...config }
        this.shadow = this.attachShadow({ mode: "open" })

        this.handleToggle = this.handleToggle.bind(this)
        this.handleSearchItem = this.handleSearchItem.bind(this)
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
    get n() { return Object.values(this.totals).reduce((sum, val) => sum + val, 0) }

    get _details() { return this.shadow.querySelector("details") }
    get _display() { return this.shadow.querySelector("summary div") }
    get _stylesheet() { return this.shadowRoot.styleSheets[0] }

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
    handleOpenAll() {
        this.handleOpen()
        for (const item of this.items) {
            const isChapter = item instanceof WerkvoorraadHoofdstuk
            if (isChapter) { item.handleOpenAll() }
        }
    }
    handleCloseAll() {
        this.handleClose()
        for (const item of this.items) {
            const isChapter = item instanceof WerkvoorraadHoofdstuk
            if (isChapter) { item.handleCloseAll() }
        }
    }
    handleToggle() {
        const isOpen = this._details.open
        isOpen ? this.handleOpen() : this.handleClose()

        const toggleState = this.getToggleStateFromLocalStorage()
        toggleState[this.id] = isOpen
        localStorage.setItem("toggleState", JSON.stringify(toggleState))
    }

    handleSearchItem(regex) {
        let wasFound = false
        const matchesLabel = regex.test(this.label)

        this.items.forEach(item => {
            const emptySearch = new RegExp("", "i")
            const isMatch = item.handleSearchItem(matchesLabel ? emptySearch : regex)
            const isEmpty = !this.hasAttribute("show-empty") && (item.n === 0)
            const shouldShow = isMatch && !isEmpty
            item.classList.toggle("hide", !shouldShow)
            if (shouldShow) { wasFound = true }
        })

        this.classList.toggle("hide", !wasFound)
        return wasFound
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

        this.shadow.innerHTML =
            `<style>${style}</style>
            <section${this.n < 1 ? ' class="empty"' : ""}>
                <details>
                    <summary>
                        <h${2 + this.depth}>${this.label}</h2>
                        <code>(${totals})</code>
                        <div></div>
                    </summary>
                </details>
            </section>`
        this.items.forEach(item => (this._details.appendChild(item)))
        this._stylesheet.insertRule(
            `h2,h3,h4,h5,h6 {
                margin-left: ${this.depth * this.config.offset}rem
            }`
        )

        const toggleState = this.getToggleStateFromLocalStorage()
        const isOpen = toggleState[this.id] ? true : false
        this._details.open = isOpen
    }

    loadFromSpec(spec) {
        const element = "items" in spec
        ? new WerkvoorraadHoofdstuk(spec, this.config, this.depth + 1)
        : new WerkvoorraadItem(spec, this.config, this.depth + 1)
        return element
    }
}

customElements.define("werkvoorraad-hoofdstuk", WerkvoorraadHoofdstuk)
