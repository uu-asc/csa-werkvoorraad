import { CheckboxGroup } from './checkbox-group.js'

const style = `
:host {}
summary {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background-color: var(--color-button);
    color: inherit;
    border: 1px solid currentColor;
    cursor: pointer;
    font-size: 1.25rem;
    user-select: none;
    margin-left: auto;
    margin-bottom: .5em;

    &:hover {
        background-color: var(--color-button-hover);
    }
    &:active {
        background-color: var(--color-button-active);
    }
}

.panel {
    background-color: var(--color-background);
    border: 1px solid currentColor;
    border-radius: 4px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

checkbox-group + checkbox-group {
    border-top: 1px solid currentColor;
    padding-top: 0.5rem;
}
`

export class ControlPanel extends HTMLElement {
    constructor(components = [], config = {}) {
        super()
        this.attachShadow({ mode: 'open' })
        this.components = components
        this.config = {
            labels: {
                filtersButton: "⚙",
            },
            ...config
        }

        this.handleToggle = this.handleToggle.bind(this)
    }

    mergeTags() {
        const allOptions = new Map()

        this.components.forEach(component => {
            if (typeof component.getTags !== 'function') return

            const options = component.getTags()

            Object.entries(options).forEach(([key, values]) => {
                if (!allOptions.has(key)) {
                    allOptions.set(key, new Set())
                }
                values.forEach(val => allOptions.get(key).add(val))
            })
        })

        return Object.fromEntries(
            Array.from(allOptions.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, valueSet]) => [
                    key,
                    Array.from(valueSet).sort((a, b) => {
                        if (a === null) return 1
                        if (b === null) return -1
                        return String(a).localeCompare(String(b))
                    })
                ])
        )
    }

    connectedCallback() {
        this.loadState()
        this.render()
        this._panel.addEventListener('toggle', this.handleToggle)
    }

    get _panel() {
        return this.shadowRoot.querySelector('details')
    }

    handleToggle() {
        this.saveState()
    }

    saveState() {
        const isOpen = this._panel.open
        localStorage.setItem('control-panel-open', isOpen)
    }

    loadState() {
        const stored = localStorage.getItem('control-panel-open')
        this.isOpen = stored === 'true'
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>${style}</style>
            <details ${this.isOpen ? 'open' : ''}>
                <summary>${this.config.labels.filtersButton}</summary>
                <div class="panel" id="panel-content"></div>
            </details>
        `

        // Get merged filter options
        const tagOptions = this.mergeTags()

        // Create and append checkbox groups
        const panelContent = this.shadowRoot.getElementById('panel-content')
        Object.entries(tagOptions).forEach(([category, values]) => {
            const group = new CheckboxGroup(
                { [category]: values },
                this.config
            )
            panelContent.appendChild(group)
        })

        // Listen for selection changes
        this.shadowRoot.addEventListener('selectionchange', this.handleSelectionChange.bind(this))
    }

    handleSelectionChange(event) {
        // Collect current state from all checkbox groups
        const selections = {}
        const groups = this.shadowRoot.querySelectorAll('checkbox-group')
        groups.forEach(group => {
            const category = group.groupLabel
            const selected = group.getSelectedValues()
            selections[category] = selected
        })
        // Dispatch unified filter-change event
        const customEvent = new CustomEvent('filter-change', {
            bubbles: true,
            composed: true,
            detail: {
                type: 'tags',
                selections
            }
        })
        this.dispatchEvent(customEvent)
    }
}

customElements.define('control-panel', ControlPanel)
