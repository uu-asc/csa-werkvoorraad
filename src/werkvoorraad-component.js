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

.filter {
    display: flex;
    margin-left: auto;
    }

#search-item {
    padding: .25rem .5em;
    border: 1px solid var(--color-text);
    border-right: none;
    border-radius: .25em 0 0 .25em;
}

#clear-query {
    display: grid;
    place-items: center;
    border: 1px solid;
    border-radius: 0 .25em .25em 0;
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
            searchItem: "Zoek items...",
        }
    }

    constructor(spec, config={}) {
        super()
        this.config = { ...this.config, ...config }
        this.shadow = this.attachShadow({ mode: 'open' })

        this.handleOpenAll = this.handleOpenAll.bind(this)
        this.handleCloseAll = this.handleCloseAll.bind(this)
        this.handleShowEmpty = this.handleShowEmpty.bind(this)
        this.handleClearQuery = this.handleClearQuery.bind(this)
        this.handleSearchItem = this.handleSearchItem.bind(this)
        this.loadFromSpec = this.loadFromSpec.bind(this)

        this.items = spec.map(this.loadFromSpec)
    }

    connectedCallback() {
        this.render()
        this._buttonOpenAll.addEventListener("click", this.handleOpenAll)
        this._buttonCloseAll.addEventListener("click", this.handleCloseAll)
        this._buttonShowEmpty.addEventListener("click", this.handleShowEmpty)
        this._buttonClearQuery.addEventListener("click", this.handleClearQuery)
        this._inputSearchItem.addEventListener("keyup", this.handleSearchItem)
        this.loadSearchValue()
    }

    get _buttonOpenAll() { return this.shadow.getElementById("open-all") }
    get _buttonCloseAll() { return this.shadow.getElementById("close-all") }
    get _buttonShowEmpty() { return this.shadow.getElementById("show-empty") }
    get _buttonClearQuery() { return this.shadow.getElementById("clear-query") }
    get _inputSearchItem() { return this.shadow.getElementById("search-item") }

    handleOpenAll() { this.items.forEach(item => item.handleOpenAll() ) }
    handleCloseAll() { this.items.forEach(item => item.handleCloseAll() ) }
    handleShowEmpty(event) {
        event.target.checked
        ? this.items.forEach(el => el.setAttribute("show-empty", ""))
        : this.items.forEach(el => el.removeAttribute("show-empty"))
        this.handleSearchItem()
    }
    handleSearchItem(event) {
        if (event.key === "Escape") { event.target.value = "" }
        this.saveSearchValue()
        const regex = new RegExp(event.target.value, "i")
        this.items.forEach(item => { item.handleSearchItem(regex) })
    }
    handleClearQuery() {
        const escapeEvent = new KeyboardEvent("keyup", { key: "Escape" })
        this._inputSearchItem.dispatchEvent(escapeEvent)
    }

    render() {
        this.shadow.innerHTML =
            `<style>${style}</style>
            <div class="acties">
                <button id="open-all">${this.config.labels.openAll}</button>
                <button id="close-all">${this.config.labels.closeAll}</button>
                <input type="checkbox" id="show-empty">
                <label for="show-empty">${this.config.labels.showEmpty}</label>
                <div class="filter">
                    <input type="text" placeholder="${this.config.labels.searchItem}" id="search-item">
                    <button id="clear-query">&Cross;</button>
                </div>
            </div>`
        this.items.forEach(item => (this.shadow.appendChild(item)))
    }

    loadFromSpec(spec) {
        return new WerkvoorraadHoofdstuk(spec, this.config)
    }

    saveSearchValue() {
        localStorage.setItem("lastSearchValue", this._inputSearchItem.value)
    }

    loadSearchValue() {
        const lastSearchValue = localStorage.getItem("lastSearchValue")
        if (lastSearchValue) {
            this._inputSearchItem.value = lastSearchValue
            const enterEvent = new KeyboardEvent("keyup", { key: "Enter" })
            this._inputSearchItem.dispatchEvent(enterEvent)
        }
    }
}

customElements.define("werkvoorraad-component", WerkvoorraadComponent)
