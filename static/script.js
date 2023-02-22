// DATA
function renderChapter(chapter, items) {
    let rendered = []
    let total = {stu: 0, sin: 0}
    for (let [idx, item] of items.entries()) {
        item.idx = idx
        item.chapter = chapter
        total.stu += item.stu.length
        rendered.push(renderRecord(item))
    }
    return `<section${total.stu < 1 ? ' class="empty"' : ""}>
        <details open>
            <summary><h2>${chapter}</h2><code>(${total.stu})</code><div class="display"></div></summary>
            ${rendered.join("")}
        </details>
    </section>`
}

function renderRecord(item) {
    return `<details class="item${item.stu.length < 1 ? " empty" : ""}">
        <summary>
            <div>${item.oms}</div>
            <label>studentnummers</label><button data-copy="${item.chapter}-${item.idx}-0-${item?.stu.length}-stu">${item?.stu.length}</button>
        </summary>
        ${item?.stu.length > 500 ? `${renderBatches(item, "stu")}` : ""}
        ${item.instructie ? `<div class="instructie"><span>Instructie</span> ${item.instructie}</div>` : ""}
        ${renderQuery(item)}
    </details>`
}

function renderBatches(item, target) {
    let chunks = getChunks(item[target], 500)
    let buttons = chunks.map(chunk => `<button data-copy="${item.chapter}-${item.idx}-${chunk[0]}-${chunk[1]}-${target}">${chunk}</button>`)
    return `<div class="batches"><div>${target === 'stu' ? "studentnummers" : "sinh_ids"}</div>${buttons.join("")}</div>`
}

function getChunks(arr, chunkSize) {
    let res = []
    let n = 0
    while (n < arr.length) {
        let next = n + chunkSize < arr.length ? n + chunkSize - 1 : arr.length
        let chunk = [n, next]
        res.push(chunk)
        n = next + 1
    }
    return res;
}

function renderQuery(item) {
    let queries = Array.isArray(item.query) ? item.query : [item.query]
    let clean = i => i.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    return queries.map(query => `<blockquote><code>${clean(query)}</code></blockquote>`).join("")
}

// COPY DATA
function copyData(event) {
    if (!event.target.matches("[data-copy]")) { return }
    let [chapter, idx, start, end, kind] = event.target.dataset.copy.split("-")
    let clip = data[chapter][idx][kind].slice(start, end).join(";")
    navigator.clipboard.writeText(clip).then(
        function() {
            let el = event.target.closest("section").querySelector(".display")
            el.innerHTML = "gekopieerd naar klembord!"
            setTimeout(function() { el.innerHTML = "" }, 1000)
        }
    )
}

// DATA
let data = {{ data|tojson }}

// WERKVOORRAAD
let output = []
for (let [chapter, items] of Object.entries(data)) {
    output.push(renderChapter(chapter, items))
}
let werkvoorraad = document.querySelector(`section[data-component="werkvoorraad"] div:last-child`)
werkvoorraad.innerHTML = output.join("")
werkvoorraad.addEventListener("click", copyData)
document.getElementById("toonalles").addEventListener("click", function() {
    document.querySelectorAll("section > details").forEach(node => node.setAttribute("open", ""))
})
document.getElementById("verbergalles").addEventListener("click", function() {
   document.querySelectorAll("details").forEach(node => node.removeAttribute("open"))
})
document.getElementById("toonleeg").addEventListener("click", function() {
    if (this.checked) {
        werkvoorraad.querySelectorAll(".empty").forEach(node => node.classList.add("show"))
    } else {
        werkvoorraad.querySelectorAll(".empty").forEach(node => node.classList.remove("show"))
    }
})

// NAVIGATION
let navigation = document.querySelector("nav")
navigation.addEventListener("click", function(event) {
    let target = event.target.dataset.showTarget
    if (target != undefined) {
        let sections = document.querySelectorAll("section[data-component]")
        sections.forEach(node => {
            let component = node.dataset.component
            if (component === target) {
                node.classList.remove("empty")
            } else {
                node.classList.add("empty")
            }
        })
        let buttons = navigation.querySelectorAll("button")
        buttons.forEach(node => {
            let component = node.dataset.showTarget
            if (component === target) {
                node.setAttribute("selected", "")
            } else {
                node.removeAttribute("selected", "")
            }
        })
    }
})
