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
}
summary div:first-child::before {
    content: '•';
    display: inline-block;
    position: relative;
    right: .25em;
}
summary > :last-child {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: .25em;
    justify-items: end;
    margin-right: 2ch;
}

.has-details summary {
    position: relative;
    cursor: pointer;
}
.has-details summary:after {
    content: "+";
    position: absolute;
    font-size: 1.25em;
    right: 0;
    transform-origin: center;
    transition: 40ms linear;
}
details.has-details[open] > summary:after {
    transform: rotate(45deg);
}
details.has-details[open] > summary {
    border-bottom: 1px dotted;
    margin-bottom: .5em;
}
details.has-details > div {
    display: grid;
    gap: .5em;
    padding-bottom: .75em;
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
}
button:hover {
    background-color: var(--color-button-hover);
}
button:active {
    background-color: var(--color-button-active);
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
    }

    constructor(spec, config={}, depth=0) {
        super()
        const { id, type, label, data, ...rest } = spec
        this.label = label
        this.data = data
        this.rest = rest
        this.config = { ...this.config, ...config }
        this.depth = depth
        this.shadow = this.attachShadow({ mode: 'open' })
        this.handleClick = this.handleClick.bind(this)
        this.handleToggle = this.handleToggle.bind(this)
        this.handleSearchItem = this.handleSearchItem.bind(this)
    }

    get n() { return Object.values(this.data).reduce((sum, arr) => sum + arr.length, 0) }
    get hasResults() { return this.n > 0 }

    get _details() { return this.shadow.querySelector("details") }
    get _stylesheet() { return this.shadowRoot.styleSheets[0] }

    connectedCallback() {
        this.render()
        this._details.addEventListener("toggle", this.handleToggle)
        this.shadow.addEventListener("click", this.handleClick)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') {
            this.hasAttribute("open")
            ? this._details.setAttribute("open", "")
            : this._details.removeAttribute("open")
        }
    }

    async handleClick(event) {
        const elem = event.target

        // collect information about any clicked element
        const info = {
            id: elem.id,
            tagName: elem.tagName.toLowerCase(),
            classes: Array.from(elem.classList),
            dataset: {...elem.dataset},
            content: elem.textContent.trim(),
        }

        // dispatch custom event with collected information
        const clickEvent = new CustomEvent('wv-item-click', {
            bubbles: true,
            composed: true,
            detail: info,
        })
        this.dispatchEvent(clickEvent)

        // leave if not main data hook
        if (!elem.matches("[data-target]")) { return }

        // copy identifiers to clipboard
        elem.classList.add("clicked")
        const target = elem.dataset.target
        const start = elem.dataset.start
        const end = elem.dataset.end

        const data = this.data[target].slice(start, end).join(";")
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
            Object.entries(this.data)
            .map(([key, arr]) => `<label>${key}</label>${this.renderButton(key, 0, arr.length)}`)

        const batches =
            Object.entries(this.data)
            .filter(([key, arr]) => arr.length > this.config.batchSize)
            .map(([key, arr]) => this.renderBatches(key, arr))

        const details =
            Object.entries(this.rest)
            .map(([key, val]) => `<div><strong>${key}</strong> ${val}</div>`)

        const hasDetails = batches.length > 0 || details.length > 0
        const classes = []
        if (this.n < 1) { classes.push("empty") }
        if (hasDetails) { classes.push("has-details") }

        this.shadow.innerHTML =
            `<style>${style}</style>
            <details class="${classes.join(" ")}">
                <summary>
                    <div>${this.label}</div>
                    <div>${buttons.join("")}</div>
                </summary>
                <div>
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
