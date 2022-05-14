// DATA
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
    let clip = data[chapter][idx][kind].join(";")
    navigator.clipboard.writeText(clip).then(
        function() {
            let el = event.target.closest("section").querySelector(".display")
            el.innerHTML = "gekopieerd naar klembord!"
            setTimeout(function() { el.innerHTML = "" }, 1000)
        }
    )
}

// METADATA
function renderMetaData(metadata) {
    let blocks = []
    for (let [label, fields] of Object.entries(metadata)) {
        let block = renderLabelData(label, fields)
        blocks.push(block)
    }
    return `<table>
        <thead>
            <th>thema</th>
            <th>veld</th>
            <th>oms</th>
            <th>dtype</th>
            <th>null</th>
            <th>cats</th>
        </thead>
        <tbody>${blocks.join("")}</tbody>
    </table>`
}

function renderLabelData(label, fields) {
    let rows = []
    let length = 0
    for (let [field, info] of Object.entries(fields)) {
        let s = filterDatamodel.value.trim().toLowerCase()
        if (s) {
            if (!(field.toLowerCase().includes(s) || info.oms.toLowerCase().includes(s))) {
                continue
            }
        }
        length++
        let cells = renderField(info)
        cells.unshift(`<td>${field}</td>`)
        rows.push(cells)
    }
    if (length === 0) { return "" }
    th = `<th rowspan=${length}>${label.split("__").join(" ")}</th>`
    rows[0].unshift(th)
    return rows.map(row => `<tr>${row.join("")}</tr>`).join("")
}

function renderField(field) {
    let render = i => `<td>${i}</td>`
    return [field.oms, field.dtype, field.hasnans, renderCats(field?.cats)].map(render)
}

function renderCats(cats) {
    if (!cats) { return "" }
    return cats.map(i => `[${i}]`).join("\n")
}

// ABSTRACTIONS
function renderAbstractions(abstractions) {
    let output = []
    for (let [key, val] of Object.entries(abstractions)) {
        if (typeof val === 'string') {
            output.push(`<details><summary>${key}</summary><blockquote>${val}</blockquote></details>`)
        } else {
            output.push(`<details open><summary>${key}</summary>${renderAbstractions(val)}</details>`)
        }
    }
    return output.join("")
}

// DATA
let data = {{ data|tojson }}
let metadata = {{ metadata|tojson }}
let abstractions = {{ abstractions|tojson }}

// DATAMODEL
let datamodel = document.querySelector(`section[data-component="datamodel"] div:last-child`)
let filterDatamodel = document.querySelector(`section[data-component="datamodel"] input`)
let clearFilter = document.querySelector(`section[data-component="datamodel"] button`)
datamodel.innerHTML = renderMetaData(metadata)
filterDatamodel.addEventListener("keyup", ({key}) => {
    if (key === 'Enter') { datamodel.innerHTML = renderMetaData(metadata) }
})
clearFilter.addEventListener("click", () => {
    filterDatamodel.value = ""
    datamodel.innerHTML = renderMetaData(metadata)
})

// BOUWSTENEN
let bouwstenen = document.querySelector(`section[data-component="bouwstenen"]`)
// bouwstenen.innerHTML = '<pre>' + JSON.stringify(abstractions, null, 2) + '</pre>'
bouwstenen.innerHTML = renderAbstractions(abstractions)

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
