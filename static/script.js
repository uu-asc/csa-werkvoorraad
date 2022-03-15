function renderChapter(chapter, items) {
    let rendered = []
    let total = {stu: 0, sin: 0}
    for (let [idx, item] of items.entries()) {
        item.idx = idx
        item.chapter = chapter
        total.stu += item.stu.length
        total.sin += item.sin.length
        rendered.push(renderRecord(item))
    }
    return `<section${total.stu < 1 ? ' class="empty"' : ""}>
        <details>
            <summary><h2>${chapter}</h2><code>(${total.stu}/${total.sin})</code><div class="display"></div></summary>
            ${rendered.join("")}
        </details>
    </section>`
}

function renderRecord(item) {
    return `<details class="item${item.stu.length < 1 ? " empty" : ""}">
        <summary>
            <div>${item.oms}</div>
            <label>studentnummers</label><button data-copy="${item.chapter}-${item.idx}-stu">${item?.stu.length}</button>
            <label>sinh_ids</label><button data-copy="${item.chapter}-${item.idx}-sin">${item?.sin.length}</button>
        </summary>
        ${item.instructie ? `<div class="instructie"><span>Instructie</span> ${item.instructie}</div>` : ""}
        ${renderQuery(item)}
    </details>`
}

function renderQuery(item) {
    let queries = Array.isArray(item.query) ? item.query : [item.query]
    let clean = i => i.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    return queries.map(query => `<blockquote><code>${clean(query)}</code></blockquote>`).join("")
}

// COPY DATA
function copyData(event) {
    if (!event.target.matches("[data-copy]")) { return }
    let [chapter, idx, kind] = event.target.dataset.copy.split("-")
    let clip = data[chapter][idx][kind]
    navigator.clipboard.writeText(clip).then(
        function() {
            let el = event.target.closest("section").querySelector(".display")
            el.innerHTML = "gekopieerd naar klembord!"
            setTimeout(function() { el.innerHTML = "" }, 1000)
        }
    )
}

let data = {{ data|tojson }}
let output = []
for (let [chapter, items] of Object.entries(data)) {
    output.push(renderChapter(chapter, items))
}
let main = document.querySelector("main")
main.innerHTML = output.join("")
main.addEventListener("click", copyData)
document.getElementById("toonalles").addEventListener("click", function() {
    document.querySelectorAll("section > details").forEach(node => node.setAttribute("open", ""))
})
document.getElementById("verbergalles").addEventListener("click", function() {
   document.querySelectorAll("details").forEach(node => node.removeAttribute("open"))
})
document.getElementById("toonleeg").addEventListener("click", function() {
    if (this.checked) {
        document.querySelectorAll(".empty").forEach(node => node.classList.add("show"))
    } else {
        document.querySelectorAll(".empty").forEach(node => node.classList.remove("show"))
    }
})
