// Change function name
export function extractTags(items) {
    const tagOptions = new Map()
    const keysWithNull = new Set()
    let hasItemWithoutTags = false

    const traverse = (item) => {
        if (item.items) {
            item.items.forEach(traverse)
        } else {
            if (!item.tags) {
                hasItemWithoutTags = true
            } else {
                Object.entries(item.tags).forEach(([key, value]) => {
                    if (!tagOptions.has(key)) {
                        tagOptions.set(key, new Set())
                    }
                    const values = Array.isArray(value) ? value : [value]
                    values.forEach(v => tagOptions.get(key).add(v))
                })

                tagOptions.forEach((values, key) => {
                    if (!keysWithNull.has(key) && !(key in item.tags)) {
                        keysWithNull.add(key)
                    }
                })
            }
        }
    }

    items.forEach(traverse)

    if (hasItemWithoutTags) {
        tagOptions.forEach((values, key) => {
            values.add(null)
        })
    } else {
        keysWithNull.forEach(key => {
            tagOptions.get(key).add(null)
        })
    }

    return Object.fromEntries(
        Array.from(tagOptions.entries()).map(([key, valueSet]) => [
            key,
            Array.from(valueSet).sort()
        ])
    )
}
