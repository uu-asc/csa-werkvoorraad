import { WerkvoorraadHoofdstuk } from "./werkvoorraad-hoofdstuk.js"
import { extractTags } from "./utils/tag-extraction.js"
import { FilterSelections } from "./utils/filter-selections.js"
import "./components/filter-input.js"

const style =
`/* CSS FOR COMPONENT */
:host {
    display: block;
    --show-counts: block;
}

:host([zen-mode]) {
    --show-counts: none;
}

.wv-controls {
    display: flex;
    gap: .25em;
    align-items: center;
    margin-block: .75em;
}

.search-group {
    display: flex;
    margin-left: auto;
}

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

.hide {
    display: none;
}
`

export class WerkvoorraadComponent extends HTMLElement {
    config = {
        labels: {
            openAll: "Toon alles",
            closeAll: "Verberg alles",
            showEmpty: "Toon lege items",
            searchItem: "Filter items...",
            zenMode: "Zen",
        }
    }

    constructor(spec, config={}) {
        super()
        this.shadow = this.attachShadow({ mode: 'open' })
        this.config = { ...this.config, ...config }
        this.id = 'werkvoorraad'

        this.handleOpenAll = this.handleOpenAll.bind(this)
        this.handleCloseAll = this.handleCloseAll.bind(this)
        this.handleShowEmpty = this.handleShowEmpty.bind(this)
        this.handleSearchItem = this.handleSearchItem.bind(this)
        this.handleToggleZenMode = this.handleToggleZenMode.bind(this)
        this.loadFromSpec = this.loadFromSpec.bind(this)

        this.items = spec.map(this.loadFromSpec)
        this.currentSearchRegex = null
        this.currentFilterSelections = new FilterSelections({})
        this.controlsIntegrated = false
    }

    get totalItemCount() {
        return this.items.reduce((sum, item) => sum + item.totalItemCount, 0)
    }
    get itemsWithResultsCount() {
        return this.items.reduce((sum, item) => sum + item.itemsWithResultsCount, 0)
    }
    getItemCounts() {
        return {
            total: this.totalItemCount,
            withResults: this.itemsWithResultsCount
        }
    }

    getTags() {
        return extractTags(this.items)
    }

    createControls() {
        if (this._controls) return this._controls

        const container = document.createElement('div')
        container.className = 'wv-controls'
        container.innerHTML = `
            <div class="folding-buttons">
                <button id="open-all">${this.config.labels.openAll}</button>
                <button id="close-all">${this.config.labels.closeAll}</button>
            </div>
            <label for="zen-mode">
                <input type="checkbox" id="zen-mode">
                ${this.config.labels.zenMode}
            </label>
            <label for="show-empty">
                <input type="checkbox" id="show-empty">
                ${this.config.labels.showEmpty}
            </label>
            <filter-input placeholder="${this.config.labels.searchItem}" id="search-item"></filter-input>
            `

        // Attach event listeners
        container.querySelector('#open-all').addEventListener('click', this.handleOpenAll)
        container.querySelector('#close-all').addEventListener('click', this.handleCloseAll)
        container.querySelector('#show-empty').addEventListener('click', this.handleShowEmpty)
        container.querySelector('#search-item').addEventListener('filter-input', this.handleSearchItem)
        container.querySelector('#zen-mode').addEventListener('change', this.handleToggleZenMode)
        this._controls = container

        this.loadSearchValue()
        return this._controls
    }

    getControlUI() {
        this.controlsIntegrated = true
        return this.createControls()
    }

    connectedCallback() {
        this.render()
        this.loadZenModeState()
    }

    get _buttonOpenAll() { return this._controls.querySelector('#open-all') }
    get _buttonCloseAll() { return this._controls.querySelector('#close-all') }
    get _buttonShowEmpty() { return this._controls.querySelector('#show-empty') }
    get _inputSearchItem() { return this._controls.querySelector('#search-item') }
    get _checkboxZenMode() { return this._controls.querySelector('#zen-mode') }

    handleOpenAll() { this.items.forEach(item => item.handleOpenAll() ) }
    handleCloseAll() { this.items.forEach(item => item.handleCloseAll() ) }
    handleShowEmpty(event) {
        event.target.checked
            ? this.items.forEach(el => el.setAttribute("show-empty", ""))
            : this.items.forEach(el => el.removeAttribute("show-empty"))

        this.updateItemVisibility()
    }
    handleSearchItem(event) {
        this.saveSearchValue(event.detail.value)
        this.currentSearchRegex = event.detail.value ? new RegExp(event.detail.value, "i") : null
        this.updateItemVisibility()
    }
    handleToggleZenMode(event) {
        const { checked } = event.target
        this.toggleAttribute("zen-mode", checked)
        localStorage.setItem("zenMode", event.target.checked)
    }

    applyFilter(selections) {
        this.currentFilterSelections = new FilterSelections(selections)
        this.updateItemVisibility()
    }

    updateItemVisibility() {
        this.items.forEach(item => {
            if (item.items) {
                this.setHoofdstukVisibility(item, this.currentSearchRegex, this.currentFilterSelections)
            } else {
                this.setItemVisibility(item, this.currentSearchRegex, this.currentFilterSelections)
            }
        })
    }

    setHoofdstukVisibility(hoofdstuk, searchRegex, filterSelections) {
        const matchesOwnLabel = searchRegex ? searchRegex.test(hoofdstuk.label) : true

        hoofdstuk.items.forEach(child => {
            if (child.items) {
                this.setHoofdstukVisibility(child, searchRegex, filterSelections)
            } else {
                // If parent matched, show all children; otherwise filter individually
                this.setItemVisibility(child, matchesOwnLabel ? null : searchRegex, filterSelections)
            }
        })

        const anyChildVisible = hoofdstuk.items.some(child => !child.classList.contains("hide"))
        hoofdstuk.classList.toggle("hide", !anyChildVisible)
    }

    setItemVisibility(item, searchRegex, filterSelections) {
        const matchesSearch = !searchRegex || item.itemMatchesSearch(searchRegex)
        const matchesTags = filterSelections.matches(item.tags)
        const isEmpty = !this.hasAttribute("show-empty") && item.n === 0

        const shouldShow = matchesSearch && matchesTags && !isEmpty
        item.classList.toggle("hide", !shouldShow)
    }

    render() {
        this.shadow.innerHTML = `<style>${style}</style>`

        if (!this.controlsIntegrated) {
            this.shadow.appendChild(this.createControls())
        }

        this.items.forEach(item => this.shadow.appendChild(item))
    }

    loadFromSpec(spec) {
        return new WerkvoorraadHoofdstuk(spec, this.config)
    }

    saveSearchValue(value) {
        localStorage.setItem("lastSearchValue", value)
    }

    loadSearchValue() {
        const lastSearchValue = localStorage.getItem("lastSearchValue")
        if (lastSearchValue) {
            this._inputSearchItem.value = lastSearchValue
            this.handleSearchItem({ detail: { value: lastSearchValue } })
        }
    }
    loadZenModeState() {
        const zenMode = localStorage.getItem("zenMode") === "true"
        this._checkboxZenMode.checked = zenMode
        if (zenMode) {
            this.setAttribute("zen-mode", "")
        }
    }
}

customElements.define("werkvoorraad-component", WerkvoorraadComponent)
