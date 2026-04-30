import * as Arrange from '/arrange/js/arrange.mjs'
import { marked } from './marked.esm.js'

let HIERARCHY
let SELECTED_HIERARCHY_NODE
let ORIGINAL_CONTENT

let SELECTED_FILENAME = location.search.split('?').pop()

const HIERARCHY_NAV = document.getElementById('hierarchy')
const PAGETITLE_DIV = document.getElementById('pagetitle')
const EDITOR_TEXTAREA = document.getElementById('editor')
const PREVIEW_DIV = document.getElementById('preview')
const SAVE_BUTTON = document.getElementById('savebutton')
const EDIT_BUTTON = document.getElementById('editbutton')
const DELETE_BUTTON = document.getElementById('deletebutton')
const RENAME_BUTTON = document.getElementById('renamebutton')

const OPEN_NAV_ELEMENTS = JSON.parse(localStorage.getItem('openNavElements') || '{}')

function processHierarchyNode(hierarchyNode, parentDomNode = HIERARCHY_NAV) {
    const details = document.createElement('details')
    parentDomNode.appendChild(details)
    const summary = document.createElement('summary')
    details.appendChild(summary)
    const label = document.createElement('label')
    label.innerHTML = hierarchyNode.label
    summary.appendChild(label)
    const hierarchyNodeIsSelected = hierarchyNode.filename === SELECTED_FILENAME
    if (hierarchyNodeIsSelected) {
        SELECTED_HIERARCHY_NODE = hierarchyNode
        label.classList.add('selected')
    }
    if (hierarchyNode.children.length < 1) {
        details.classList.add('empty')
    }
    let nodeNeedsToBeOpened = hierarchyNodeIsSelected
    for (const childNode of hierarchyNode.children.sort((a, b) => a.label.localeCompare(b.label))) {
        const childIsSelected = processHierarchyNode(childNode, details)
        if (childIsSelected) {
            nodeNeedsToBeOpened = true
        }
    }
    if (nodeNeedsToBeOpened || OPEN_NAV_ELEMENTS[hierarchyNode.filename]) {
        details.open = true
    }
    label.addEventListener('click', async (clickEvent) => {
        clickEvent.preventDefault()
        SELECTED_FILENAME = hierarchyNode.filename
        history.pushState(undefined, undefined, '?' + hierarchyNode.filename)
        rebuildHierarchyDom()
        await loadContent()
    })
    details.addEventListener('toggle', async () => {
        if (details.open && !details.classList.contains('empty')) {
            OPEN_NAV_ELEMENTS[hierarchyNode.filename] = hierarchyNode.label
        } else {
            delete OPEN_NAV_ELEMENTS[hierarchyNode.filename]
        }
        localStorage.setItem('openNavElements', JSON.stringify(OPEN_NAV_ELEMENTS))
    })
    return nodeNeedsToBeOpened
}

function deleteChild(childList, nodeToDelete) {
    const index = childList.indexOf(nodeToDelete)
    if (index >= 0) {
        childList.splice(index, 1)
    } else {
        for (const child of childList) {
            deleteChild(child.children, nodeToDelete)
        }
    }
}

async function deleteRecursively(hierarchyNode) {
    while (hierarchyNode.children.length > 0) {
        const lastChild = hierarchyNode.children.pop()
        await deleteRecursively(lastChild)
    }
    await Arrange.deletePublicPath('/wiki/nodes/' + hierarchyNode.filename, true)
}

// Beendet den Bearbeiten-Modus
function hideEditor() {
    EDITOR_TEXTAREA.classList.add('invisible')
    EDIT_BUTTON.classList.remove('invisible')
    SAVE_BUTTON.classList.add('invisible')
    document.getElementById('cancelbutton').classList.add('invisible')
}

// Lädt die Hierarchie vom Server, wird einmalig beim Start oder beim Refresh gemacht
async function loadHierarchy() {
    const file = await Arrange.getPublicFile('/wiki/hierarchy.json')
    if (file.status === 404) {
        HIERARCHY = []
        await saveHierarchy()
    } else {
        HIERARCHY = await file.json()
    }
}

async function loadContent() {
    const response = await Arrange.getPublicFile('/wiki/nodes/' + SELECTED_FILENAME)
    const fileContent = response.ok ? await response.text() : ''
    EDITOR_TEXTAREA.value = fileContent
    ORIGINAL_CONTENT = fileContent
    updateContent()
    DELETE_BUTTON.classList.remove('invisible')
    RENAME_BUTTON.classList.remove('invisible')
    hideEditor()
    PAGETITLE_DIV.innerHTML = SELECTED_HIERARCHY_NODE?.label
}

// Baut den DOM der Hierarchie komplett neu auf, wird nach jeder Änderung gemacht
function rebuildHierarchyDom() {
    const hierarchy = document.getElementById('hierarchy')
    hierarchy.innerHTML = ''
    for (const childNode of HIERARCHY) {
        processHierarchyNode(childNode)
    }
}

// Speichert die Hierarchie auf dem Server, wird nach jeder Veränderung der Hierarchie gemacht
async function saveHierarchy() {
    await Arrange.postPublicTextFile('/wiki/hierarchy.json', JSON.stringify(HIERARCHY))
}

async function save() {
    const content = EDITOR_TEXTAREA.value
    await Arrange.postPublicTextFile('/wiki/nodes/' + SELECTED_FILENAME, content)
    ORIGINAL_CONTENT = content
    SAVE_BUTTON.setAttribute('disabled', 'disabled')
}

// Zeigt den Bearbeiten-Modus und übernimmt das HTML des selektierten Elementes in das Textfeld
function showEditor() {
    EDITOR_TEXTAREA.classList.remove('invisible')
    EDIT_BUTTON.classList.add('invisible')
    SAVE_BUTTON.classList.remove('invisible')
    document.getElementById('cancelbutton').classList.remove('invisible')
}

function updateContent() {
    PREVIEW_DIV.innerHTML = marked(EDITOR_TEXTAREA.value)
}

// Wenn der "Neu" - Button angeklickt wurde wird an dem selektierten Hierarchieelement ein neues Unterelement erstellt
document.getElementById('addbutton').addEventListener('click', async () => {
    const label = prompt('Bezeichnung für neuen Eintrag', 'Neuer Eintrag')
    if (!label) return
    const filename = '' + Math.floor(Date.now() * 100000 + Math.random() * 100000)
    const childrenList = SELECTED_HIERARCHY_NODE ? SELECTED_HIERARCHY_NODE.children : HIERARCHY
    const newChild = {
        filename: filename,
        label: label,
        children: []
    }
    childrenList.push(newChild)
    ORIGINAL_CONTENT = '# ' + label + '\n'
    EDITOR_TEXTAREA.value = ORIGINAL_CONTENT
    await Arrange.postPublicFile('/wiki/nodes/' + filename, ORIGINAL_CONTENT)
    await saveHierarchy()
    SELECTED_FILENAME = filename
    PAGETITLE_DIV.innerHTML = label
    history.pushState(undefined, undefined, '?' + filename)
    rebuildHierarchyDom()
    updateContent()
    showEditor()
})

// Mit dem Abbrechen-Button wird der Bearbeiten-Modus deaktiviert
document.getElementById('cancelbutton').addEventListener('click', async () => {
    EDITOR_TEXTAREA.value = ORIGINAL_CONTENT
    updateContent()
    hideEditor()
})

DELETE_BUTTON.addEventListener('click', async () => {
    if (!confirm('Soll das Element und alle Unterelemente wirklich gelöscht werden?')) return
    const nodeToDelete = SELECTED_HIERARCHY_NODE
    await deleteRecursively(nodeToDelete)
    deleteChild(HIERARCHY, nodeToDelete)
    await saveHierarchy()
    location.href = '?'
})

// Mit dem Bearbeiten-Button wird der Bearbeiten-Modus aktiviert
EDIT_BUTTON.addEventListener('click', async () => {
    showEditor()
})

// Beim Speichern wird der Inhalt auf dem Server gespeichert und der Bearbeiten-Modus beendet
SAVE_BUTTON.addEventListener('click', async () => {
    await save()
    updateContent()
    hideEditor()
})

EDITOR_TEXTAREA.addEventListener('input', () => {
    SAVE_BUTTON.removeAttribute('disabled')
    updateContent()
})

EDITOR_TEXTAREA.addEventListener('keydown', async (keyEvent) => {
    if (keyEvent.ctrlKey && keyEvent.key === 's') {
        keyEvent.preventDefault()
        await save()
    }
})

document.querySelector('.sidebar header').addEventListener('click', () => {
    EDIT_BUTTON.classList.add('invisible')
    DELETE_BUTTON.classList.add('invisible')
    RENAME_BUTTON.classList.add('invisible')
    SELECTED_FILENAME = ''
    SELECTED_HIERARCHY_NODE = undefined
    PAGETITLE_DIV.innerHTML = ''
    history.pushState(undefined, undefined, '?')
    rebuildHierarchyDom()
    ORIGINAL_CONTENT = ''
    EDITOR_TEXTAREA.value = ORIGINAL_CONTENT
    updateContent()
})

RENAME_BUTTON.addEventListener('click', async (keyEvent) => {
    const newName = prompt('Name', SELECTED_HIERARCHY_NODE.label)
    if (newName) {
        SELECTED_HIERARCHY_NODE.label = newName
        await saveHierarchy()
        rebuildHierarchyDom()
        PAGETITLE_DIV.innerHTML = newName
    }
})


await loadHierarchy()
rebuildHierarchyDom()

if (SELECTED_FILENAME) await loadContent()