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
        const buttons = Object.entries(data)
            .map(([key, arr]) => `<div><label>${key}</label>${this.renderButton(key, 0, arr.length)}</div>`)
        const batches = Object.entries(data)
            .filter(([key, arr]) => arr.length > this.batchSize)
            .map(([key, arr]) => this.renderBatches(key, arr))

        return `<style>
            summary {
                border-top: 1px solid var(--brand, black);
                width: 100%;
                padding: 0.5rem 0;
                position: relative;
                cursor: pointer;
                list-style: none;
                display: flex;
                align-items: center;
                gap: .5rem;
            }

            summary:after {
                content: "+";
                position: absolute;
                font-size: 1.75em;
                line-height: 0;
                margin-top: 0.75rem;
                right: 0;
                top: 25%;
                font-weight: 200;
                transform-origin: center;
                transition: 50ms linear;
            }

            details[open] > summary:after {
                transform: rotate(45deg);
                font-size: 2em;
            }
        </style>
        <details class="item${data.studentnummer.length < 1 ? " empty" : ""}">
            <summary>
                <div>${oms}</div>
                ${buttons.join("")}
            </summary>
            ${batches.join("")}
            ${instructie ? `<div class="instructie"><span>Instructie</span> ${instructie}</div>` : ""}
        </details>`
    }

    renderButton(target, start, end, isBatch=false) {
        const label = isBatch ? `${start}-${end}` : end
        return `<button data-target="${target}" data-start="${start}" data-end="${end}">${label}</button>`
    }

    renderBatches(target, arr) {
        const batches = this.getBatches(arr, this.batchSize)
        const buttons = batches.map(batch => this.renderButton(target, batch.start, batch.end, true))
        return `<div class="batches">
            <div>${target}</div>
            ${buttons.join("")}
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
