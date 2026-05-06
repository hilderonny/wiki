import { marked } from './marked.esm.js'

import Article from './types/Article.mjs'
import Hierarchy from './types/Hierarchy.mjs'
import NavigationElement from './components/navigation-element.mjs'

const vueApp = {
    components: {
        NavigationElement
    },
    computed: {
        formatSelectedArticle() {
            return marked(this.selectedArticle?.Content || '')
        }
    },
    data() {
        return {
            contentBeforeEditing: undefined,
            hierarchy: undefined,
            isContentChanged: false,
            isEditing: false,
            openNavigationElements: undefined,
            selectedArticle: undefined,
            selectedHierarchyElement: undefined,
        }
    },
    async created() {
        this.openNavigationElements = JSON.parse(localStorage.getItem('openNavElements') || '{}')
        const hierarchyFromServer = await Hierarchy.loadListWithQuery('SELECT * FROM Hierarchy ORDER BY Title')
        for (const hierarchyElement of hierarchyFromServer) {
            if (hierarchyElement.ParentId) {
                const parentElement = hierarchyFromServer.find(element => element.Id === hierarchyElement.ParentId)
                if (!parentElement.children) {
                    parentElement.children = []
                }
                parentElement.children.push(hierarchyElement)
                hierarchyElement.parentElement = parentElement
            }
            if (this.openNavigationElements[hierarchyElement.Id]) {
                hierarchyElement.isOpen = true
            }
        }
        this.hierarchy = hierarchyFromServer.filter(element => !element.ParentId)
        const idToLoad = location.search.split('?').pop()
        if (idToLoad) {
            await this.handleHierarchyElementClicked(hierarchyFromServer.find(element => element.Id === idToLoad))
        }
    },
    methods: {
        async handleAddButtonClick() {
            const title = prompt('Bezeichnung für neuen Eintrag', 'Neuer Eintrag')
            if (!title) return
            const article = new Article({ Content: `# ${title}\n` })
            await article.save()
            const hierarchyElement = new Hierarchy({ 
                ArticleId: article.Id,
                LastEditedAt: Date.now(),
                LastEditedBy: localStorage.getItem('username'),
                Title: title,
            })
            if (this.selectedHierarchyElement) {
                hierarchyElement.ParentId = this.selectedHierarchyElement.Id
                if (!this.selectedHierarchyElement.children) {
                    this.selectedHierarchyElement.children = []
                }
                this.selectedHierarchyElement.children.push(hierarchyElement)
                this.selectedHierarchyElement.children.sort((element1, element2) => element1.Title.localeCompare(element2.Title))
                await this.handleHierarchyElementToggled(this.selectedHierarchyElement, true)
            } else {
                this.hierarchy.push(hierarchyElement)
                this.hierarchy.sort((element1, element2) => element1.Title.localeCompare(element2.Title))
            }
            await hierarchyElement.save()
            hierarchyElement.parentElement = this.selectedHierarchyElement
            await this.handleHierarchyElementClicked(hierarchyElement)
            this.isEditing = true
        },
        handleCancelButtonClick() {
            this.selectedArticle.Content = this.contentBeforeEditing
            this.isEditing = false
        },
        async handleDeleteButtonClick() {
            if (!confirm(`Soll das Element "${this.selectedHierarchyElement.Title}" und alle Unterelemente wirklich gelöscht werden?`)) return
            if (this.selectedHierarchyElement.parentElement) {
                this.selectedHierarchyElement.parentElement.children.splice(this.selectedHierarchyElement.parentElement.children.indexOf(this.selectedHierarchyElement), 1)
            }
            await this.selectedHierarchyElement.deleteFromDatabase()
            this.isEditing = false
            location.href = '?'
        },
        handleEditButtonClick() {
            this.contentBeforeEditing = '' + this.selectedArticle.Content
            this.isContentChanged = false
            this.isEditing = true
        },
        async handleHierarchyElementClicked(hierarchyElement) {
            if (this.selectedHierarchyElement) {
                this.selectedHierarchyElement.isSelected = false
            }
            hierarchyElement.isSelected = true
            this.selectedHierarchyElement = hierarchyElement
            await this.loadArticle()
        },
        async handleHierarchyElementToggled(hierarchyElement, isOpen) {
            hierarchyElement.isOpen = isOpen
            if (isOpen) {
                this.openNavigationElements[hierarchyElement.Id] = hierarchyElement.Id
            } else {
                delete this.openNavigationElements[hierarchyElement.Id]
            }
            localStorage.setItem('openNavElements', JSON.stringify(this.openNavigationElements))
        },
        async handleRenameButtonClick() {
            const newTitle = prompt('Bezeichnung', this.selectedHierarchyElement.Title)
            if (newTitle) {
                this.selectedHierarchyElement.Title = newTitle
                // Ringabhängigkeiten vermeiden
                const parentElement = this.selectedHierarchyElement.parentElement
                delete this.selectedHierarchyElement.parentElement
                const children = this.selectedHierarchyElement.children
                delete this.selectedHierarchyElement.children
                await this.selectedHierarchyElement.save()
                this.selectedHierarchyElement.parentElement = parentElement
                this.selectedHierarchyElement.children = children
            }
        },
        async handleSaveButtonClick() {
            await this.selectedArticle.save()
            this.isEditing = false
        },
        async handleTextareaKeyDown(event) {
            if (event.ctrlKey && event.key === 's') {
                event.preventDefault()
                await this.selectedArticle.save()
                this.isContentChanged = false
                this.contentBeforeEditing = '' + this.selectedArticle.Content
            }
        },
        async loadArticle() {
            this.selectedArticle = await Article.loadFromDatabase(this.selectedHierarchyElement.ArticleId)
            history.pushState(undefined, undefined, '?' + this.selectedHierarchyElement.Id)
        }
    }
}

Vue.createApp(vueApp).mount('body')

/*
TODO:
- Verschieben
- Seiten private machen
- updatedatabase.html löschen, wenn Wiki aktualisiert wurde
*/