import { SelectionPreventionMixin } from "./mixins/selection-prevention.js"

const style =
`/* CSS FOR ITEM */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
}

/* layout */
summary {
    border-top: 1px solid;
    min-width: 200px;
    padding: 0.5em 0;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: .5em;

    .label::before {
        content: '•';
        display: inline-block;
        position: relative;
        right: .25em;
    }
    .buttons {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: .25em;
        justify-items: end;
        margin-right: 2ch;
    }
}

.has-details {
    summary {
        position: relative;
        cursor: pointer;

        &:after {
            content: "+";
            position: absolute;
            font-size: 1.25em;
            right: 0;
            transform-origin: center;
            transition: 40ms linear;
        }
    }

    &[open] {
        summary {
            border-bottom: 1px dotted;
            margin-bottom: .5em;

            &:after {
                transform: rotate(45deg);
            }
        }
    }
}

.item-details {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: .5em;
    padding-bottom: .75em;
    padding-right: 5em;

    > [data-action="show-query-details"] {
        position: absolute;
        top: 0;
        right: 2ch;

        font-size: .75rem;
        min-width: 0;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
    }
}

.batches {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15ch, 1fr));
    gap: .125em;
    margin-bottom: .5rem;
}

/* styling */
label {
    font-family: monospace;
}

button {
    min-width: 5ch;
    background-color: var(--color-button);
    color: inherit;
    cursor: pointer;
    font-family: monospace;
    border: 1px solid;
    border-radius: 4px;

    &:hover {
        background-color: var(--color-button-hover);
    }
    &:active {
        background-color: var(--color-button-active);
    }
}

.link:hover {
    cursor: pointer;
    text-decoration: underline;
}

/* utility */
.empty {
    display: none;
}
:host([show-empty]) .empty {
    display: block;
}
.batches .clicked {
    text-decoration: line-through;
    font-style: italic;
}
`

export class WerkvoorraadItem extends HTMLElement {
    static observedAttributes = ["open"]
    config = {
        batchSize: 500,
        offset: .5,
        queryDetailsLabel: "Ｑ",
    }

    constructor(spec, config={}, depth=0) {
        super()
        const { id, type, label, data, ids, ...rest } = spec
        this.label = label
        this.data = data
        this.ids = ids
        this.rest = rest
        this.config = { ...this.config, ...config }
        this.depth = depth
        this.shadow = this.attachShadow({ mode: 'open' })

        Object.assign(this, SelectionPreventionMixin)
        this.initSelectionPrevention()

        this.handleClick = this.handleClick.bind(this)
        this.handleToggle = this.handleToggle.bind(this)
        this.handleSearchItem = this.handleSearchItem.bind(this)
    }

    get n() { return Object.values(this.ids).reduce((sum, arr) => sum + arr.length, 0) }
    get hasResults() { return this.n > 0 }

    get _details() { return this.shadow.querySelector("details") }
    get _stylesheet() { return this.shadowRoot.styleSheets[0] }

    connectedCallback() {
        this.render()
        this._details.addEventListener("toggle", this.handleToggle)
        this.shadow.addEventListener("click", this.handleClick)
        this._details.addEventListener("mousedown", this.handleMouseDown)
        this._details.addEventListener("mouseup", this.handleMouseUp)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') {
            this.hasAttribute("open")
            ? this._details.setAttribute("open", "")
            : this._details.removeAttribute("open")
        }
    }

    async handleClick(event) {
        if (this.checkShouldPreventClick(event)) return
        const elem = event.target

        // collect information about any clicked element
        const info = {
            id: elem.id,
            tagName: elem.tagName.toLowerCase(),
            classes: Array.from(elem.classList),
            dataset: {...elem.dataset},
            content: elem.textContent.trim(),
        }

        // attach data object if showing query details
        if (elem.dataset.action === 'show-query-details') {
            info.data = this.data
        }

        // dispatch custom event with collected information
        const clickEvent = new CustomEvent('wv-item-click', {
            bubbles: true,
            composed: true,
            detail: info,
        })
        this.dispatchEvent(clickEvent)

        // leave if not main data hook
        if (!elem.matches("[data-target]")) return

        // copy identifiers to clipboard
        elem.classList.add("clicked")
        const target = elem.dataset.target
        const start = elem.dataset.start
        const end = elem.dataset.end

        const data = this.ids[target].slice(start, end).join(";")
        await navigator.clipboard.writeText(data)
        const clipboardWriteEvent = new CustomEvent("clipboardWriteEvent", {
            bubbles: true,
            composed: true,
        })
        this.dispatchEvent(clipboardWriteEvent)
    }

    handleOpen() { this.setAttribute("open", "") }
    handleClose() { this.removeAttribute("open")}
    handleToggle() { this._details.open ? this.handleOpen() : this.handleClose() }

    handleSearchItem(regex) {
        return regex.test(this.label)
    }

    render() {
        const buttons =
            Object.entries(this.ids)
            .map(([key, arr]) => `<label>${key}</label>${this.renderButton(key, 0, arr.length)}`)

        const batches =
            Object.entries(this.ids)
            .filter(([key, arr]) => arr.length > this.config.batchSize)
            .map(([key, arr]) => this.renderBatches(key, arr))

        const queryDetailsButton = this.data?.query
            ? `<button data-action="show-query-details">${this.config.queryDetailsLabel}</button>`
            : ''

        const details =
            Object.entries(this.rest)
            .map(([key, val]) => `<div><strong>${key}</strong> ${val}</div>`)

        const hasDetails = batches.length > 0 || details.length > 0 || queryDetailsButton
        const classes = []
        if (this.n < 1) { classes.push("empty") }
        if (hasDetails) { classes.push("has-details") }

        this.shadow.innerHTML =
            `<style>${style}</style>
            <details class="${classes.join(" ")}">
                <summary>
                    <div class="label">${this.label}</div>
                    <div class="buttons">${buttons.join("")}</div>
                </summary>
                <div class="item-details">
                    ${queryDetailsButton}
                    ${details.join("")}
                    ${batches.join("")}
                </div>
            </details>`
        this._stylesheet.insertRule(
            `summary > div, details > div {
                margin-left: ${this.depth * this.config.offset}rem
            }`
        )
    }

    renderButton(target, start, end, isBatch=false) {
        const label = isBatch ? `${start}-${end}` : end
        return `<button data-target="${target}" data-start="${start}" data-end="${end}">${label}</button>`
    }

    renderBatches(target, arr) {
        const batches = this.getBatches(arr, this.config.batchSize)
        const buttons = batches.map(batch => this.renderButton(target, batch.start, batch.end, true))
        return `<div>
            <div><code>${target}</code></div>
            <div class="batches">${buttons.join("")}</div>
        </div>`
    }

    getBatches(arr, batchSize) {
        let batches = []
        let n = 0
        while (n < arr.length) {
            let next = n + batchSize < arr.length ? n + batchSize - 1 : arr.length
            let batch = { start: n, end: next }
            batches.push(batch)
            n = next + 1
        }
        return batches
    }
}

customElements.define("werkvoorraad-item", WerkvoorraadItem)
