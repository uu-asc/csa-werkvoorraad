export const SelectionPreventionMixin = {
    initSelectionPrevention() {
        this.mouseDownTime = 0
        this.mouseDownPos = null
        this.shouldPreventClick = false

        this.handleMouseDown = this.handleMouseDown.bind(this)
        this.handleMouseUp = this.handleMouseUp.bind(this)
    },

    handleMouseDown(event) {
        this.mouseDownTime = Date.now()
        this.mouseDownPos = { x: event.clientX, y: event.clientY }
        this.shouldPreventClick = false
    },

    handleMouseUp(event) {
        const holdTime = Date.now() - this.mouseDownTime
        const distance = Math.sqrt(
            Math.pow(event.clientX - this.mouseDownPos.x, 2) +
            Math.pow(event.clientY - this.mouseDownPos.y, 2)
        )

        if (holdTime > 300 || distance > 5) {
            this.shouldPreventClick = true
        }
    },

    checkShouldPreventClick(event) {
        if (this.shouldPreventClick) {
            event.preventDefault()
            event.stopPropagation()
            this.shouldPreventClick = false
            return true
        }
        return false
    }
}
