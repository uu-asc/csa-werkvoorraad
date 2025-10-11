const style = `
:host {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5em;
    align-items: center;
}

.timestamp,
.timestamp-warning {
    font-family: monospace;
}

.timestamp-warning-mild { color: orange; }
.timestamp-warning-moderate { color: darkorange; }
.timestamp-warning-severe { color: red; }
`

export class TimestampDisplay extends HTMLElement {
    static observedAttributes = ['timestamp', 'threshold', 'locale', 'show-warning']

    config = {
        locale: 'nl-NL',
        threshold: 4,
        showWarning: false,
        labels: {
            nl: {
                hour: 'uur',
                hours: 'uren',
                day: 'dag',
                days: 'dagen',
                warning: 'LET OP! Laatste update was'
            },
            en: {
                hour: 'hour',
                hours: 'hours',
                day: 'day',
                days: 'days',
                warning: 'WARNING! Last update was'
            }
        }
    }

    constructor() {
        super()
        this.shadow = this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this.render()
        this.update()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.update()
        }
    }

    get timestamp() {
        return this.getAttribute('timestamp')
    }

    get threshold() {
        return parseFloat(this.getAttribute('threshold') ?? this.config.threshold)
    }

    get locale() {
        return this.getAttribute('locale') ?? this.config.locale
    }

    get showWarning() {
        return this.hasAttribute('show-warning')
    }

    get language() {
        return this.locale.startsWith('nl') ? 'nl' : 'en'
    }

    formatTimestamp(date) {
        return date.toLocaleString(this.locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(',', '')
    }

    calculateWarning(date) {
        const labels = this.config.labels[this.language]
        const now = new Date()
        const diffMs = now - date
        const diffHours = diffMs / (1000 * 60 * 60)

        if (diffHours <= this.threshold) {
            return { shouldWarn: false }
        }

        const timeAgo = diffHours < 24
            ? `${Math.round(diffHours)} ${diffHours === 1 ? labels.hour : labels.hours}`
            : `${Math.floor(diffHours / 24)} ${Math.floor(diffHours / 24) === 1 ? labels.day : labels.days}`

        const severity =
            diffHours > 24 ? 'severe' :
            diffHours > 8 ? 'moderate' : 'mild'

        return {
            shouldWarn: true,
            message: `${labels.warning} ${timeAgo} geleden`,
            severity: `timestamp-warning-${severity}`
        }
    }

    update() {
        if (!this.timestamp) return

        const date = new Date(this.timestamp)
        const formatted = this.formatTimestamp(date)

        const timestampSpan = this.shadow.querySelector('.timestamp')
        const warningSpan = this.shadow.querySelector('.timestamp-warning')

        if (timestampSpan) {
            timestampSpan.textContent = formatted
        }

        if (this.showWarning && warningSpan) {
            const warningInfo = this.calculateWarning(date)
            if (warningInfo.shouldWarn) {
                warningSpan.textContent = warningInfo.message
                warningSpan.className = `timestamp-warning ${warningInfo.severity}`
            } else {
                warningSpan.textContent = ''
                warningSpan.className = 'timestamp-warning'
            }
        }
    }

    render() {
        this.shadow.innerHTML = `
            <style>${style}</style>
            <span class="timestamp"></span>
            ${this.showWarning ? '<span class="timestamp-warning"></span>' : ''}
        `
    }
}

customElements.define('timestamp-display', TimestampDisplay)
