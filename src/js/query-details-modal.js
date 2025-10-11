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

    &[open] {
        display: grid;
        grid-template-rows: auto auto 1fr;
    }
    &::backdrop {
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
    }
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .25rem .5rem;
    border-bottom: 1px solid var(--color-text);
    background: var(--color-button);

    h3  {
        margin: 0;
        font-family: monospace;
        font-size: 1rem;
    }

    #close-button {
        background: transparent;
        border: none;
        font-size: 1rem;
        cursor: pointer;
        color: var(--color-text);
        border-radius: 4px;

        &:hover {
            background: var(--color-button-hover);
        }
    }
}

.metadata {
    display: grid;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-text);

    &:empty {
        display: none;
    }
}

.metadata-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;

    strong {
        font-family: monospace;
    }
}

.metadata-item-list {
    display: grid;
    gap: 0.25rem;
    margin-left: 1rem;
}

.metadata-item-list-value {
    display: flex;
    align-items: center;
    min-height: 1.5em;
    background: var(--color-button);
    padding: .5em 1em;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
    cursor: pointer;
    user-select: none;

    &:hover {
        background: var(--color-button-hover);
    }

    &:active {
        background: var(--color-button-active);
    }
}

.sql {
    position: relative;
    overflow: auto;
    padding: 1.5rem;

    pre {
        margin: 0;
        overflow: auto;
    }

    code {
        font-size: 0.9em;
    }
}

.copy-button {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: transparent;
    border: none;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: inherit;
}
`

export class QueryDetailsModal extends HTMLElement {
    constructor() {
        super()
        this.shadow = this.attachShadow({ mode: "open" })
        this.sqlMap = {}

        this.handleClose = this.handleClose.bind(this)
        this.handleItemClick = this.handleItemClick.bind(this)
        this.handleDialogClick = this.handleDialogClick.bind(this)
        this.show = this.show.bind(this)
    }

    connectedCallback() {
        this.render()
        this._dialog.addEventListener("click", this.handleDialogClick)
        this._dialog.addEventListener("click", event => {
            if (event.target === this._dialog) this.handleClose()
        })
        this._closeButton.addEventListener("click", this.handleClose)

        document.addEventListener("wv-item-click", this.handleItemClick)
    }

    disconnectedCallback() {
        this._dialog.removeEventListener("click", this.handleDialogClick)
        document.removeEventListener("wv-item-click", this.handleItemClick)
    }

    get _dialog() { return this.shadow.querySelector("dialog") }
    get _closeButton() { return this.shadow.getElementById("close-button") }
    get _title() { return this.shadow.getElementById("modal-title") }
    get _metadataSection() { return this.shadow.querySelector(".metadata") }
    get _sqlSection() { return this.shadow.querySelector(".sql") }

    setSqlMap(map) {
        this.sqlMap = map
    }

    handleItemClick(event) {
        const { dataset, data } = event.detail
        if (dataset.action === "show-query-details" && data) {
            this.show(data)
        }
    }

    async handleDialogClick(event) {
        const target = event.target
        const copyValue = target.dataset.copy

        if (!copyValue) return

        const originalText = target.textContent
        await navigator.clipboard.writeText(copyValue)
        target.textContent = "✓"
        setTimeout(() => {
            target.textContent = originalText
        }, 1000)
    }

    handleClose() {
        this._dialog.close()
    }

    show(data) {
        const queryFilename = data.query
        const sqlText = this.sqlMap[queryFilename] ?? "-- SQL not found"

        // Set title
        // this._title.textContent = queryFilename

        // Build metadata section
        const metadataHTML = []
        for (const [key, value] of Object.entries(data)) {

            // Skip empty values
            if (value === null || value === undefined) continue
            if (Array.isArray(value) && value.length === 0) continue
            if (typeof value === "string" && value.trim() === "") continue

            // Format
            const array = Array.isArray(value) ? value : [value]
            const items = array
                .map(item => `<div class="metadata-item-list-value" data-copy="${this.escapeHtml(item)}">${item}</div>`)
                .join("")

            metadataHTML.push(`
                <div class="metadata-item">
                    <strong>${key}:</strong>
                    <div class="metadata-item-list">${items}</div>
                </div>
            `)
        }

        this._metadataSection.innerHTML = metadataHTML.join("")

        // Set SQL with syntax highlighting
        this._sqlSection.innerHTML = `<pre><code class="language-sql">${this.escapeHtml(sqlText)}</code></pre>`

    // Add copy button
    if (!this._sqlSection.querySelector(".copy-button")) {
        const copyButton = document.createElement("button")
        copyButton.className = "copy-button"
        copyButton.innerHTML = "⧉"
        copyButton.onclick = async (event) => {
            event.stopPropagation()
            const codeText = this._sqlSection.querySelector("pre code").textContent
            await navigator.clipboard.writeText(codeText)
            copyButton.textContent = "✓"
            setTimeout(() => copyButton.innerHTML = "⧉", 1500)
        }
        this._sqlSection.appendChild(copyButton)
    }

        // Apply Prism highlighting if available
        if (window.Prism) {
            window.Prism.highlightAllUnder(this._sqlSection)
        }

        this._dialog.showModal()
    }

    escapeHtml(text) {
        const div = document.createElement("div")
        div.textContent = text
        return div.innerHTML
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                @import url("https://lcvriend.github.io/wc-multi-selector/static/prism.css");
                ${style}
            </style>
            <dialog>
                <header>
                    <h3>Query</h3>
                    <button id="close-button">&times;</button>
                </header>
                <div class="metadata"></div>
                <div class="sql"></div>
            </dialog>
        `
    }
}

customElements.define("query-details-modal", QueryDetailsModal)
