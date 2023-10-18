import { WerkvoorraadHoofdstuk } from "https://uu-asc.github.io/csa-werkvoorraad/src/werkvoorraad-hoofdstuk.js"

const style =
`button {
    background-color: var(--color-shade-1);
    color: inherit;
    cursor: pointer;
    padding: .125em .25em;
    font-family: monospace;
    border: 1px solid;
    border-radius: 4px;
}

button:hover {
    background-color: var(--color-shade-2);
}

button:active {
    background-color: var(--color-shade-3);
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
        this.hoofdstukken = {}
        spec.forEach(this.loadFromSpec.bind(this))
        this.toggleState = this.getToggleStateFromLocalStorage()
        this.applyInitialToggleStates()
        this.handleOpenAll = this.handleOpenAll.bind(this)
        this.handleCloseAll = this.handleCloseAll.bind(this)
        this.handleShowEmpty = this.handleShowEmpty.bind(this)
    }

    connectedCallback() {
        this.render()
        this._buttonOpenAll.addEventListener("click", this.handleOpenAll)
        this._buttonCloseAll.addEventListener("click", this.handleCloseAll)
        this._buttonShowEmpty.addEventListener("click", this.handleShowEmpty)
    }

    get _buttonOpenAll() { this.getElementById("open-all") }
    get _buttonCloseAll() { this.getElementById("close-all") }
    get _buttonShowEmpty() { this.getElementById("show-empty") }

    handleToggleState() {
        const toggleState = {}
            document.addEventListener("toggle", event => {
            toggleState[event.target.id] = event.detail.isOpen
            localStorage.setItem("toggleState", JSON.stringify(toggleState))
            console.log(toggleState)
        })
    }
    handleOpenAll() { this.hoofdstukken.forEach(el => el.setAttribute("open", "")) }
    handleCloseAll() { this.hoofdstukken.forEach(el => el.removeAttribute("open")) }
    handleShowEmpty(event) {
        event.target.checked
        ? this.hoofdstukken.forEach(el => el.setAttribute("show-empty", ""))
        : this.hoofdstukken.forEach(el => el.removeAttribute("show-empty"))
    }

    render() {
        this.innerHTML = `<style>${style}</style>
        <div class="acties">
            <button id="open-all">${this.config.labels.openAll}</button>
            <button id="close-all">${this.config.labels.closeAll}</button>
            <input type="checkbox" id="show-empty">
            <label for="show-empty">${this.config.labels.showEmpty}</label>
        </div>`
        Object.values(this.hoofdstukken).forEach(this.appendChild)
    }

    loadFromSpec(spec) {
        const { id, label, items } = spec
        const element = new WerkvoorraadHoofdstuk(id, label, items, this.config)
        this.hoofdstukken[id] = element
    }

    getToggleStateFromLocalStorage() {
        const json = localStorage.getItem("toggleState")
        return JSON.parse(json) ?? {}
    }

    applyInitialToggleStates() {
        Object.entries(this.toggleState).forEach(([key, val]) => {
            if (key in this.hoofdstukken) {
                const hoofdstuk = this.hoofdstukken[key]
                val ? hoofdstuk.setAttribute("open", "") : hoofdstuk.removeAttribute("open")
            }
        })
    }
}

customElements.define("werkvoorraad-component", WerkvoorraadComponent)
