export class FilterSelections {
    constructor(selections = {}) {
        this.raw = selections
        this.isActive = Object.keys(selections).some(key => selections[key].length > 0)
        this.categories = Object.keys(selections)
    }

    matches(itemTags) {
        if (!this.isActive) return true

        if (!itemTags) {
            // Item has no tags - matches if null selected in all active categories
            return this.categories.every(cat =>
                this.raw[cat].length === 0 || this.raw[cat].includes(null)
            )
        }

        return this.categories.every(cat => {
            const selected = this.raw[cat]
            if (selected.length === 0) return true

            const itemValues = itemTags[cat]
            if (!itemValues) return selected.includes(null)

            const arr = Array.isArray(itemValues) ? itemValues : [itemValues]
            return arr.some(val => selected.includes(val))
        })
    }
}
