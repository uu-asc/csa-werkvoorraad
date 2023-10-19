import { WerkvoorraadHoofdstuk } from "https://uu-asc.github.io/csa-werkvoorraad/src/werkvoorraad-hoofdstuk.js"

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
        this.toggleState = this.getToggleStateFromLocalStorage()

        this.chapters = {}
        spec.forEach(this.loadFromSpec.bind(this))

        this.handleToggleState = this.handleToggleState.bind(this)
        this.handleOpenAll = this.handleOpenAll.bind(this)
        this.handleCloseAll = this.handleCloseAll.bind(this)
        this.handleShowEmpty = this.handleShowEmpty.bind(this)
    }

    connectedCallback() {
        this.render()
        this._buttonOpenAll.addEventListener("click", this.handleOpenAll)
        this._buttonCloseAll.addEventListener("click", this.handleCloseAll)
        this._buttonShowEmpty.addEventListener("click", this.handleShowEmpty)
        this.shadow.addEventListener("toggle", this.handleToggleState)
        this.applyInitialToggleStates()
    }

    get _items() { return Object.values(this.chapters) }
    get _buttonOpenAll() { return this.shadow.getElementById("open-all") }
    get _buttonCloseAll() { return this.shadow.getElementById("close-all") }
    get _buttonShowEmpty() { return this.shadow.getElementById("show-empty") }

    handleToggleState(event) {
        this.toggleState[event.target.id] = event.detail.isOpen
        localStorage.setItem("toggleState", JSON.stringify(this.toggleState))
    }

    handleOpenAll() { this._items.forEach(el => el.setAttribute("open", "")) }
    handleCloseAll() { this._items.forEach(el => el.removeAttribute("open")) }
    handleShowEmpty(event) {
        event.target.checked
        ? this._items.forEach(el => el.setAttribute("show-empty", ""))
        : this._items.forEach(el => el.removeAttribute("show-empty"))
    }

    render() {
        this.shadow.innerHTML = `<style>${style}</style>
        <div class="acties">
            <button id="open-all">${this.config.labels.openAll}</button>
            <button id="close-all">${this.config.labels.closeAll}</button>
            <input type="checkbox" id="show-empty">
            <label for="show-empty">${this.config.labels.showEmpty}</label>
        </div>`
        this._items.forEach(item => (this.shadow.appendChild(item)))
    }

    loadFromSpec(spec) {
        const { id } = spec
        const element = new WerkvoorraadHoofdstuk(spec, this.config)
        this.chapters[id] = element
    }

    getToggleStateFromLocalStorage() {
        const json = localStorage.getItem("toggleState")
        return JSON.parse(json) ?? {}
    }

    applyInitialToggleStates() {
        Object.entries(this.toggleState).forEach(([key, val]) => {
            if (key in this.chapters) {
                const chapter = this.chapters[key]
                val ? chapter.setAttribute("open", "") : chapter.removeAttribute("open")
            }
        })
    }
}

customElements.define("werkvoorraad-component", WerkvoorraadComponent)
