import { WerkvoorraadHoofdstuk } from "./werkvoorraad-hoofdstuk.js"

const style =
`button {
    background-color: var(--color-button);
    color: inherit;
    cursor: pointer;
    padding: .125em .25em;
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

.acties {
    margin-block: .75em;
}`

export class WerkvoorraadComponent extends HTMLElement {
    config = {
        labels: {
            openAll: "Toon alles",
            closeAll: "Verberg alles",
            showEmpty: "queries zonder resultaten",
        }
    }

    constructor(spec, config={}) {
        super()
        this.config = { ...this.config, ...config }
        this.shadow = this.attachShadow({ mode: 'open' })

        this.handleOpenAll = this.handleOpenAll.bind(this)
        this.handleCloseAll = this.handleCloseAll.bind(this)
        this.handleShowEmpty = this.handleShowEmpty.bind(this)
        this.loadFromSpec = this.loadFromSpec.bind(this)

        this.items = spec.map(this.loadFromSpec)
    }

    connectedCallback() {
        this.render()
        this._buttonOpenAll.addEventListener("click", this.handleOpenAll)
        this._buttonCloseAll.addEventListener("click", this.handleCloseAll)
        this._buttonShowEmpty.addEventListener("click", this.handleShowEmpty)
    }

    get _buttonOpenAll() { return this.shadow.getElementById("open-all") }
    get _buttonCloseAll() { return this.shadow.getElementById("close-all") }
    get _buttonShowEmpty() { return this.shadow.getElementById("show-empty") }

    handleOpenAll() { this.items.forEach(item => item.handleOpenAll() ) }
    handleCloseAll() { this.items.forEach(item => item.handleCloseAll() ) }
    handleShowEmpty(event) {
        event.target.checked
        ? this.items.forEach(el => el.setAttribute("show-empty", ""))
        : this.items.forEach(el => el.removeAttribute("show-empty"))
    }

    render() {
        this.shadow.innerHTML =
            `<style>${style}</style>
            <div class="acties">
                <button id="open-all">${this.config.labels.openAll}</button>
                <button id="close-all">${this.config.labels.closeAll}</button>
                <input type="checkbox" id="show-empty">
                <label for="show-empty">${this.config.labels.showEmpty}</label>
            </div>`
        this.items.forEach(item => (this.shadow.appendChild(item)))
    }

    loadFromSpec(spec) {
        return new WerkvoorraadHoofdstuk(spec, this.config)
    }
}

customElements.define("werkvoorraad-component", WerkvoorraadComponent)
