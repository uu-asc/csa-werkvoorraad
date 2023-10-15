export class WerkvoorraadItem extends HTMLElement {
    batchSize = 500

    constructor(item) {
        super()
        this.item = item
        this.shadow = this.attachShadow({ mode: 'open' })
        this.handleClick= this.handleClick.bind(this)
    }

    connectedCallback() {
        this.shadow.innerHTML = this.render()
        this.shadow.addEventListener("click", this.handleClick)
    }

    async handleClick(event) {
        if (!event.target.matches("[data-target]")) { return }
        const target = event.target.dataset.target
        const start = event.target.dataset.start
        const end = event.target.dataset.end

        const clip = this.item.data[target].slice(start, end).join(";")
        await navigator.clipboard.writeText(clip)
        const el = event.target.closest("section").querySelector(".display")
        el.innerHTML = "gekopieerd naar klembord!"
        setTimeout(() => { el.innerHTML = "" }, 1000)
    }

    render() {
        const {oms, data, instructie} = this.item
        const n = Object.values(data).reduce((sum, arr) => sum + arr.length, 0)
        const buttons =
            Object.entries(data)
            .map(([key, arr]) => `<label>${key}</label>${this.renderButton(key, 0, arr.length)}`)
        const batches =
            Object.entries(data)
            .filter(([key, arr]) => arr.length > this.batchSize)
            .map(([key, arr]) => this.renderBatches(key, arr))

        return `<style>
            *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
            }

            summary {
                border-top: 1px solid var(--brand, black);
                min-width: 200px;
                padding: 0.5em 0;
                position: relative;
                cursor: pointer;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: .5em;
            }

            summary:after {
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

            details[open] > summary:after {
                transform: rotate(45deg);
            }

            details[open] > summary {
                border-bottom: 1px dotted var(--brand, black);
                margin-bottom: .5em;
            }

            summary div:last-child {
                display: grid;
                grid-template-columns: 1fr auto;
                margin-inline: auto 2em;
                gap: .25em;
            }

            label, button {
                font-family: monospace;
            }

            .batches {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(15ch, 1fr));
                gap: .125em;
                margin-bottom: .5rem;
            }

            .empty {
                display: none;
            }

            :host([show-empty]) .empty {
                display: block;
            }
        </style>
        <details${n < 1 ? ' class="empty"' : ""}>
            <summary>
                <div>${oms}</div>
                <div>${buttons.join("")}</div>
            </summary>
            ${instructie ? `<div class="instructie"><strong>Instructie</strong> ${instructie}</div>` : ""}
            ${batches.join("")}
        </details>`
    }

    renderButton(target, start, end, isBatch=false) {
        const label = isBatch ? `${start}-${end}` : end
        return `<button data-target="${target}" data-start="${start}" data-end="${end}">${label}</button>`
    }

    renderBatches(target, arr) {
        const batches = this.getBatches(arr, this.batchSize)
        const buttons = batches.map(batch => this.renderButton(target, batch.start, batch.end, true))
        return `<div>
            <div>${target}</div>
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
