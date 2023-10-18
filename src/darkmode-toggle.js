const style =
`button {
    color: inherit;
    cursor: pointer;
    font-size: 1.5em;
    background: transparent;
    border: none;
    height: 1.5em;
}

button:hover {
    transform: scale(1.25);
}

.hidden {
    display: none;
}`

export class DarkModeToggle extends HTMLElement {
    config = {
        buttonTitle: "Click to switch themes"
    }

    constructor(config={}) {
        super()
        this.config = { ...this.config, ...config }
        this.shadow = this.attachShadow({ mode: 'open' })
        this.scheme = this.getUserPreference()
        this.handleClick = this.handleClick.bind(this)
        this.dispatch = this.dispatch.bind(this)
    }

    connectedCallback() {
        this.render()
        this._button.addEventListener("click", this.handleClick)
        this.dispatch()
    }

    get _button() { return this.shadow.querySelector("button") }
    get _sun() { return this.shadow.getElementById("sun") }
    get _moon() { return this.shadow.getElementById("moon") }

    handleClick() {
        this._sun.classList.toggle("hidden")
        this._moon.classList.toggle("hidden")
        this.scheme = this.scheme === "dark" ? "light" : "dark"
        localStorage.setItem("prefers-color-scheme", this.scheme)
        this.dispatch()
    }

    dispatch() {
        const event = new CustomEvent("color-scheme-change", {
            composed: true,
            bubbles: true,
            detail: { scheme: this.scheme }
        })
        this.dispatchEvent(event)
    }

    getUserPreference() {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const storedMode = localStorage.getItem("prefers-color-scheme")
        const prefersDarkMode = (mediaQuery.matches && storedMode === null) || storedMode === "dark"
        return prefersDarkMode ? "dark" : "light"
    }

    render() {
        this.shadow.innerHTML =
        `<style>${style}</style>
        <button title="${this.config.buttonTitle}">
            <span id="sun"${this.scheme === "dark" ? ' class="hidden"' : ""}>☼</span>
            <span id="moon"${this.scheme === "light" ? ' class="hidden"' : ""}>☽</span>
        </button>`
    }
}

customElements.define("darkmode-toggle", DarkModeToggle)
