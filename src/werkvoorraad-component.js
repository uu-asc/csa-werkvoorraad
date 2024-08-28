import { WerkvoorraadHoofdstuk } from "./werkvoorraad-hoofdstuk.js"

const style =
`/* CSS FOR COMPONENT */
button {
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
    display: flex;
    gap: .25em;
    align-items: center;
    margin-block: .75em;
}

#search-label {
    height: 1.25em;
    margin-left: auto;
}

.hide {
    display: none;
}
`

export class WerkvoorraadComponent extends HTMLElement {
    config = {
        labels: {
            openAll: "Toon alles",
            closeAll: "Verberg alles",
            showEmpty: "queries zonder resultaten",
            searchLabelPlaceholder: "Zoek item...",
        }
    }

    constructor(spec, config={}) {
        super()
        this.config = { ...this.config, ...config }
        this.shadow = this.attachShadow({ mode: 'open' })

        this.handleOpenAll = this.handleOpenAll.bind(this)
        this.handleCloseAll = this.handleCloseAll.bind(this)
        this.handleShowEmpty = this.handleShowEmpty.bind(this)
        this.handleSearchLabel = this.handleSearchLabel.bind(this)
        this.loadFromSpec = this.loadFromSpec.bind(this)

        this.items = spec.map(this.loadFromSpec)
    }

    connectedCallback() {
        this.render()
        this._buttonOpenAll.addEventListener("click", this.handleOpenAll)
        this._buttonCloseAll.addEventListener("click", this.handleCloseAll)
        this._buttonShowEmpty.addEventListener("click", this.handleShowEmpty)
        this._inputSearchLabel.addEventListener("keyup", this.handleSearchLabel)
    }

    get _buttonOpenAll() { return this.shadow.getElementById("open-all") }
    get _buttonCloseAll() { return this.shadow.getElementById("close-all") }
    get _buttonShowEmpty() { return this.shadow.getElementById("show-empty") }
    get _inputSearchLabel() { return this.shadow.getElementById("search-label") }

    handleOpenAll() { this.items.forEach(item => item.handleOpenAll() ) }
    handleCloseAll() { this.items.forEach(item => item.handleCloseAll() ) }
    handleShowEmpty(event) {
        event.target.checked
        ? this.items.forEach(el => el.setAttribute("show-empty", ""))
        : this.items.forEach(el => el.removeAttribute("show-empty"))
        this.handleSearchLabel()
    }
    handleSearchLabel() {
        const query = this._inputSearchLabel.value
        const regex = new RegExp(query, "i")
        this.items.forEach(item => { item.handleSearchLabel(regex) })
    }

    render() {
        this.shadow.innerHTML =
            `<style>${style}</style>
            <div class="acties">
                <button id="open-all">${this.config.labels.openAll}</button>
                <button id="close-all">${this.config.labels.closeAll}</button>
                <input type="checkbox" id="show-empty">
                <label for="show-empty">${this.config.labels.showEmpty}</label>
                <input type="text" placeholder="${this.config.labels.searchLabelPlaceholder}" id="search-label">
            </div>`
        this.items.forEach(item => (this.shadow.appendChild(item)))
    }

    loadFromSpec(spec) {
        return new WerkvoorraadHoofdstuk(spec, this.config)
    }
}

customElements.define("werkvoorraad-component", WerkvoorraadComponent)
