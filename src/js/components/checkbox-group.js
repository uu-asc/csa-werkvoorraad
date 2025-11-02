export class CheckboxGroup extends HTMLElement {
    config = {
        labels: {
            filtersAll: "Alle",
            null: "(geen)",
        }
    }

    constructor(data = null, config = {}) {
        super()
        this.attachShadow({ mode: "open" })
        this.config = {
            labels: {
                ...this.config.labels,
                ...(config.labels ?? {})
            }
        }
        this.selectedItems = new Set()
        this.data = {}
        this.groupLabel = ""
        this.storageKey = null
        if (data) this.setData(data)
    }

    connectedCallback() {
        this.shadowRoot.addEventListener("click", this.handleClick.bind(this))
        if (this.groupLabel) {
            this.loadFromStorage()
            this.render()
        }
    }

    setData(data) {
        this.groupLabel = Object.keys(data)[0]
        this.data = data[this.groupLabel] ?? []

        // Generate storage key with sanitized pathname
        const sanitizedPath = location.pathname.replace(/[\/\s]+/g, "-").replace(/^-+|-+$/g, "")
        const sanitizedLabel = this.groupLabel.toLowerCase().replace(/\s+/g, "-")
        this.storageKey = `checkbox-group-${sanitizedPath}-${sanitizedLabel}`

        this.selectedItems.clear()
        this.loadFromStorage()

        if (this.isConnected) {
            this.render()
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {}
                header {
                    display: flex;
                    gap: .5em;
                    align-items: center;
                    margin-bottom: .5em;
                    justify-content: space-between;

                    label {
                        display: flex;
                        align-items: center;
                        font-size: .8em;
                        gap: .25em;
                    }
                }
                #checkboxes {
                    display: flex;
                    flex-wrap: wrap;
                    gap: .5em;
                }
                #category-name {
                    font-variant: small-caps;
                    font-weight: bold;
                }
                button {
                    background-color: var(--color-button);
                    color: inherit;
                    cursor: pointer;
                    padding: .25em .5em;
                    font-family: monospace;
                    font-size: .875em;
                    border: 1px solid;
                    border-radius: 4px;

                    &.select-all {
                        width: 1rem;
                        height: 1rem;
                        border-radius: 50%;
                        padding: 0;
                    }
                }
                button:hover {
                    background-color: var(--color-button-hover);
                }
                button:active {
                    background-color: var(--color-button-active);
                }
                .filter-button.selected {
                    background-color: var(--color-button-active);
                    outline: 1px solid currentColor;
                }
            </style>
            <header>
                <div id="category-name">${this.groupLabel}</div>
                <label>
                    ${this.config.labels.filtersAll}
                    <button type="button" class="select-all"></button>
                </label>
            </header>
            <div id="checkboxes">
            ${this.data.map(val => {
                const displayValue = val === null ? this.config.labels.null : val
                const dataValue = val === null ? '__null__' : val
                return `
                    <button
                        type="button"
                        class="filter-button"
                        data-value="${dataValue}"
                        data-actual-value="${val === null ? 'null' : val}">
                        ${displayValue}
                    </button>`
            }).join("")}
            </div>
        `
        this.syncCheckboxes()
    }

    handleClick(event) {
        if (event.target.classList.contains("select-all")) {
            const allSelected = this.data.every(val => this.selectedItems.has(val))
            if (allSelected) {
                this.selectedItems.clear()
            } else {
                this.data.forEach(val => this.selectedItems.add(val))
            }
            this.syncCheckboxes()
            this.saveToStorage()
            this.emitChange()
            return
        }

        const button = event.target.classList.contains("filter-button")
            ? event.target
            : null

        if (!button) return

        // Get the actual value (convert '__null__' back to null)
        const actualValue = button.dataset.value === '__null__' ? null : button.dataset.value

        if (event.shiftKey) {
            this.selectedItems.clear()
            this.selectedItems.add(actualValue)
        } else {
            if (this.selectedItems.has(actualValue)) {
                this.selectedItems.delete(actualValue)
            } else {
                this.selectedItems.add(actualValue)
            }
        }

        this.syncCheckboxes()
        this.saveToStorage()
        this.emitChange()
    }

    saveToStorage() {
        if (this.storageKey) {
            localStorage.setItem(this.storageKey, JSON.stringify(this.getSelectedValues()))
        }
    }

    loadFromStorage() {
        if (!this.storageKey) return

        const stored = localStorage.getItem(this.storageKey)
        if (stored) {
            try {
                const storedItems = JSON.parse(stored)
                // Convert null back to '__null__' and filter to existing data
                const converted = storedItems.map(item => item === null ? '__null__' : item)
                this.selectedItems = new Set(converted.filter(item => this.data.includes(item)))

                // Emit change event if we loaded any items
                if (this.selectedItems.size > 0) {
                    this.emitChange()
                }
            } catch (e) {
                console.warn("Failed to load from storage:", e)
            }
        }
    }

    syncCheckboxes() {
        const buttons = this.shadowRoot.querySelectorAll(".filter-button")
        buttons.forEach(btn => {
            const actualValue = btn.dataset.value === '__null__' ? null : btn.dataset.value
            const hasValue = this.selectedItems.has(actualValue)
            btn.classList.toggle("selected", hasValue)
        })
    }

    emitChange() {
        this.dispatchEvent(new CustomEvent("selectionchange", {
            detail: {
                selected: this.getSelectedValues(),
                groupLabel: this.groupLabel
            },
            bubbles: true,
            composed: true,
        }))
    }

    getSelectedValues() {
        return Array.from(this.selectedItems).map(val =>
            val === '__null__' ? null : val
        )
    }
}

customElements.define("wv-checkbox-group", CheckboxGroup)
