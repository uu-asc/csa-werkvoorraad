export class FilterInput extends HTMLElement {
    static styles = `
        :host {
            box-sizing: border-box;
            display: grid;
            grid-template-columns: 1fr auto;
        }

        input {
            border: 1px solid;
            outline: none;
            padding: .25em .75em;
            border-radius: .25em;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            background: transparent;
            font: inherit;
            color: inherit;
            min-width: 0;
        }

        button {
            display: grid;
            place-items: center;
            border: 1px solid;
            border-radius: .25em;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            border-left: none;
            background: transparent;
            cursor: pointer;
            font: inherit;
            font-size: .875em;
            color: inherit;
            opacity: 0.7;
            user-select: none;
        }

        button:hover {
            opacity: 1;
        }
    `

    static get observedAttributes() {
        return ["placeholder"]
    }

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.handleInput = this.handleInput.bind(this)
        this.handleClear = this.handleClear.bind(this)
        this.handleKeydown = this.handleKeydown.bind(this)
    }

    connectedCallback() {
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        this.removeEventListeners()
    }

    addEventListeners() {
        const input = this.shadowRoot.querySelector("input")
        const button = this.shadowRoot.querySelector("button")

        input.addEventListener("input", this.handleInput)
        input.addEventListener("keydown", this.handleKeydown)
        button.addEventListener("click", this.handleClear)
    }

    removeEventListeners() {
        const input = this.shadowRoot.querySelector("input")
        const button = this.shadowRoot.querySelector("button")

        if (input) {
            input.removeEventListener("input", this.handleInput)
            input.removeEventListener("keydown", this.handleKeydown)
        }
        if (button) {
            button.removeEventListener("click", this.handleClear)
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return
        if (name === "placeholder") {
            this.updatePlaceholder()
        }
    }

    updatePlaceholder() {
        const input = this.shadowRoot.querySelector("input")
        if (!input) return

        const placeholder = this.getAttribute("placeholder")
        if (placeholder !== null) {
            input.placeholder = placeholder
        } else {
            input.removeAttribute("placeholder")
        }
    }

    get input() {
        return this.shadowRoot.querySelector("input")
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>${FilterInput.styles}</style>
            <input type="text">
            <button type="button" tabindex="-1">🞨</button>
        `
        this.updatePlaceholder()
    }

    handleInput(event) {
        const filterInputEvent = new CustomEvent("filter-input", {
            detail: { value: event.target.value },
            bubbles: true
        })
        this.dispatchEvent(filterInputEvent)
    }

    handleKeydown(event) {
        if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            this.clear()
        }
    }

    handleClear() {
        this.clear()
        this.input.focus()
    }

    clear() {
        const input = this.shadowRoot.querySelector("input")
        if (input.value !== "") {
            input.value = ""
            const filterInputEvent = new CustomEvent("filter-input", {
                detail: { value: "" },
                bubbles: true
            })
            this.dispatchEvent(filterInputEvent)
        }
    }

    get value() {
        return this.input ? this.input.value : ""
    }

    set value(val) {
        if (this.input) {
            this.input.value = val
        }
    }

    focus() {
        if (this.input) {
            this.input.focus()
        }
    }
}

customElements.define("wv-filter-input", FilterInput)
