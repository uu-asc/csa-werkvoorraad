const style =
`*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
}

details {
    padding-bottom: .75em;
}

summary {
    border-top: 1px solid;
    min-width: 200px;
    padding: 0.5em 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .5em;
}

summary.has-details {
    position: relative;
    cursor: pointer;
}

summary.has-details:after {
    content: "+";
    position: absolute;
    font-size: 1.25em;
    line-height: 0;
    margin-top: 0.75rem;
    right: 0;
    top: 25%;
    transform-origin: center;
    transition: 40ms linear;
}

details[open] > summary.has-details:after {
    transform: rotate(45deg);
}

details[open] > summary.has-details {
    border-bottom: 1px dotted;
    margin-bottom: .5em;
}

summary > div:last-child {
    display: grid;
    grid-template-columns: 1fr auto;
    margin-inline: auto 2ch;
    gap: .25em;
}

summary button {
    min-width: 5ch;
    background-color: var(--color-shade-1);
    color: inherit;
    cursor: pointer;
    font-family: monospace;
    border: 1px solid;
    border-radius: 4px;
}

summary button:hover {
    background-color: var(--color-shade-2);
}

summary button:active {
    background-color: var(--color-shade-3);
}

details > div {
    display: grid;
    gap: .5em;
}

.batches {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15ch, 1fr));
    gap: .125em;
    margin-bottom: .5rem;
}

label {
    font-family: monospace;
}

.empty {
    display: none;
}

:host([show-empty]) .empty {
    display: block;
}`

export class WerkvoorraadItem extends HTMLElement {
    static observedAttributes = ["open"]
    config = {
        batchSize: 500,
    }

    constructor(item) {
        super()
        this.item = item
        this.shadow = this.attachShadow({ mode: 'open' })
        this.handleClick = this.handleClick.bind(this)
        this.handleToggle = this.handleToggle.bind(this)
    }

    get _details() { return this.shadow.querySelector("details") }

    connectedCallback() {
        this.shadow.innerHTML = this.render()
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
        if (!event.target.matches("[data-target]")) { return }
        const target = event.target.dataset.target
        const start = event.target.dataset.start
        const end = event.target.dataset.end

        const data = this.item.data[target].slice(start, end).join(";")
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

    render() {
        const { label, data, ...rest } = this.item

        const buttons =
            Object.entries(data)
            .map(([key, arr]) => `<label>${key}</label>${this.renderButton(key, 0, arr.length)}`)

        const batches =
            Object.entries(data)
            .filter(([key, arr]) => arr.length > this.config.batchSize)
            .map(([key, arr]) => this.renderBatches(key, arr))

        const details =
            Object.entries(rest)
            .map(([key, val]) => `<div><strong>${key}</strong> ${val}</div>`)

        const n = Object.values(data).reduce((sum, arr) => sum + arr.length, 0)
        const hasDetails = batches.length > 0 || details.length > 0

        return `<style>${style}</style>
        <details${n < 1 ? ' class="empty"' : ""}>
            <summary${hasDetails ? ' class="has-details"' : ""}>
                <div>${label}</div>
                <div>${buttons.join("")}</div>
            </summary>
            <div>
            ${details.join("")}
            ${batches.join("")}
            </div>
        </details>`
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
