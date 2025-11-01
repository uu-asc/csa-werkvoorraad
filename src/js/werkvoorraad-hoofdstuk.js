import { WerkvoorraadItem } from "./werkvoorraad-item.js"
import { SelectionPreventionMixin } from "./utils/selection-prevention.js"

const style =
`/* CSS FOR HOOFDSTUK */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
}
:host {
    display: block;
}

/* layout */
summary {
    border-top: 2px solid;
    min-width: 200px;
    padding: .5em 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: .5em;
    overflow-x: hidden;

    > :where(h2, h3, h4, h5, h6) {
        flex: 0 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    code {
        flex: 1 1 0;
        display: var(--show-counts);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    span.toggle-indicator {
        margin-left: auto;
        font-size: 1.75em;
        transform-origin: center;
        transition: 100ms ease;
    }
}

:host([depth="0"]) {
    summary {
        border-top: 4px solid;
        border-bottom: 1px solid;
        position: sticky;
        top: 0;
        background-color: var(--color-background);
        z-index: 1;
    }
}

details[open] .toggle-indicator {
    transform: rotate(45deg);
}

/* styling */
h2, h3, h4, h5, h6 {
    font-variant: small-caps;
}

/* utility */
.hide {
    display: none;
}
`

export class WerkvoorraadHoofdstuk extends HTMLElement {
    static observedAttributes = ["open"]
    config = {
        clipboardWriteLabel: "gekopieerd!",
        offset: .5,
    }

    constructor(spec, config={}, depth=0) {
        super()
        this.id = spec.id
        this.depth = depth
        this.setAttribute('depth', depth)
        this.label = spec.label
        this.config = { ...this.config, ...config }
        this.shadow = this.attachShadow({ mode: "open" })

        Object.assign(this, SelectionPreventionMixin)
        this.initSelectionPrevention()

        this.handleToggle = this.handleToggle.bind(this)
        this.handleSummaryClick = this.handleSummaryClick.bind(this)
        this.loadFromSpec = this.loadFromSpec.bind(this)

        this.items = spec.items.map(this.loadFromSpec)
    }

    get totals() {
        const totals = {}
        for (const item of this.items) {
            const isChapter = item instanceof WerkvoorraadHoofdstuk
            const source = isChapter ? item.totals : item.results
            for (const [key, val] of Object.entries(source)) {
                const n = Array.isArray(val) ? val.length : val
                totals[key] = (totals[key] ?? 0) + n
            }
        }
        return totals
    }
    get n() { return Object.values(this.totals).reduce((sum, val) => sum + val, 0) }

    get totalItemCount() {
        let count = 0
        for (const item of this.items) {
            count += item instanceof WerkvoorraadHoofdstuk
                ? item.totalItemCount
                : 1
        }
        return count
    }

    get itemsWithResultsCount() {
        let count = 0
        for (const item of this.items) {
            count += item instanceof WerkvoorraadHoofdstuk
                ? item.itemsWithResultsCount
                : (item.hasResults ? 1 : 0)
        }
        return count
    }

    get _details() { return this.shadow.querySelector("details") }
    get _summary() { return this.shadow.querySelector("summary") }
    get _display() { return this.shadow.querySelector("summary div") }
    get _stylesheet() { return this.shadowRoot.styleSheets[0] }

    connectedCallback() {
        this.render()
        this._details.addEventListener("toggle", this.handleToggle)
        this._summary.addEventListener("click", this.handleSummaryClick)
        this.addEventListener("clipboardWriteEvent", event => {
            event.stopPropagation()
            this._display.innerHTML = this.config.clipboardWriteLabel
            setTimeout(() => { this._display.innerHTML = "" }, 1000)
        })

        this._summary.addEventListener("mousedown", this.handleMouseDown)
        this._summary.addEventListener("mouseup", this.handleMouseUp)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        const attrWasAdded = this.hasAttribute(name)
        switch (name) {
            case "open":
                attrWasAdded
                ? this._details.setAttribute("open", "")
                : this._details.removeAttribute("open")
                break
            default:
                return
        }
    }

    handleSummaryClick(event) {
        if (this.checkShouldPreventClick(event)) return

        if (event.shiftKey) {
            event.preventDefault()
            if (window.getSelection) {
                window.getSelection().removeAllRanges()
            }
            const isCurrentlyOpen = this._details.open
            isCurrentlyOpen ? this.handleCloseAll() : this.handleOpenAll()
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

    handleMouseDown(event) {
        this.mouseDownTime = Date.now()
        this.mouseDownPos = { x: event.clientX, y: event.clientY }
        this.shouldPreventClick = false
    }
    handleMouseUp(event) {
        const holdTime = Date.now() - this.mouseDownTime
        const distance = Math.sqrt(
            Math.pow(event.clientX - this.mouseDownPos.x, 2) +
            Math.pow(event.clientY - this.mouseDownPos.y, 2)
        )
        // when selecting text prevent click behavior on details element
        if (holdTime > 300 || distance > 5) {
            this.shouldPreventClick = true
        }
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

        const totalsTooltip =
            Object.entries(this.totals)
            .map(([key, n]) => `${key}: ${n}`)
            .join('\n')

        this.shadow.innerHTML =
            `<style>${style}</style>
            <section${this.n < 1 ? ' class="empty"' : ""}>
                <details>
                    <summary>
                        <h${2 + this.depth}>${this.label}</h2>
                        <code title="${totalsTooltip}">(${totals})</code>
                        <span class="toggle-indicator">+</span>
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
