const style = `
:host {
    display: contents;
}

dialog {
    border: none;
    border-radius: 8px;
    background: var(--color-background);
    color: var(--color-text);
    margin: auto;
    max-width: 80vw;
    max-height: 90vh;
    padding: 0;
}

dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
}

.modal-wrapper {
    display: grid;
    grid-template-rows: auto auto 1fr;
    max-height: 90vh;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-text);
    background: var(--color-button);
}

.modal-header h3 {
    margin: 0;
    font-family: monospace;
    font-size: 1rem;
}

#close-button {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text);
    padding: 0.25rem;
    border-radius: 4px;
}

#close-button:hover {
    background: var(--color-button-hover);
}

.metadata-section {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-text);
    display: grid;
    gap: 0.5rem;
}

.metadata-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
}

.metadata-item strong {
    font-family: monospace;
}

.where-list {
    display: grid;
    gap: 0.25rem;
    margin-left: 1rem;
}

.where-item {
    background: var(--color-button);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
}

.sql-section {
    overflow: auto;
    padding: 1.5rem;
}

.sql-section pre {
    margin: 0;
    overflow: auto;
}

.sql-section code {
    font-size: 0.9em;
}
`

export class QueryDetailsModal extends HTMLElement {
    constructor() {
        super()
        this.shadow = this.attachShadow({ mode: 'open' })
        this.sqlMap = {}

        this.handleClose = this.handleClose.bind(this)
        this.handleItemClick = this.handleItemClick.bind(this)
        this.show = this.show.bind(this)
    }

    connectedCallback() {
        this.render()
        this._dialog.addEventListener('click', (e) => {
            if (e.target === this._dialog) this.handleClose()
        })
        this._closeButton.addEventListener('click', this.handleClose)

        document.addEventListener('wv-item-click', this.handleItemClick)
    }

    disconnectedCallback() {
        document.removeEventListener('wv-item-click', this.handleItemClick)
    }

    get _dialog() { return this.shadow.querySelector('dialog') }
    get _closeButton() { return this.shadow.getElementById('close-button') }
    get _title() { return this.shadow.getElementById('modal-title') }
    get _metadataSection() { return this.shadow.querySelector('.metadata-section') }
    get _sqlSection() { return this.shadow.querySelector('.sql-section') }

    setSqlMap(map) {
        this.sqlMap = map
    }

    handleItemClick(event) {
        const { dataset, data } = event.detail
        if (dataset.action === 'show-query-details' && data) {
            this.show(data)
        }
    }

    handleClose() {
        this._dialog.close()
    }

    show(data) {
        const queryFilename = data.query
        const sqlText = this.sqlMap[queryFilename] ?? '-- SQL not found'

        // Set title
        this._title.textContent = queryFilename

        // Build metadata section
        const metadataHTML = []
        for (const [key, value] of Object.entries(data)) {
            if (key === 'query') continue // Skip query as it's in title

            if (key === 'where' && Array.isArray(value)) {
                const whereItems = value
                    .map(clause => `<div class="where-item">${clause}</div>`)
                    .join('')
                metadataHTML.push(`
                    <div class="metadata-item">
                        <strong>${key}:</strong>
                        <div class="where-list">${whereItems}</div>
                    </div>
                `)
            } else {
                const displayValue = Array.isArray(value) ? value.join(', ') : value
                metadataHTML.push(`
                    <div class="metadata-item">
                        <strong>${key}:</strong>
                        <span>${displayValue}</span>
                    </div>
                `)
            }
        }

        this._metadataSection.innerHTML = metadataHTML.join('')

        // Set SQL with syntax highlighting
        this._sqlSection.innerHTML = `<pre><code class="language-sql">${this.escapeHtml(sqlText)}</code></pre>`

        // Apply Prism highlighting if available
        if (window.Prism) {
            window.Prism.highlightAllUnder(this._sqlSection)
        }

        this._dialog.showModal()
    }

    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    render() {
        this.shadow.innerHTML = `
            <style>${style}</style>
            <dialog>
                <div class="modal-wrapper">
                    <div class="modal-header">
                        <h3 id="modal-title"></h3>
                        <button id="close-button">&times;</button>
                    </div>
                    <div class="metadata-section"></div>
                    <div class="sql-section"></div>
                </div>
            </dialog>
        `
    }
}

customElements.define('query-details-modal', QueryDetailsModal)
