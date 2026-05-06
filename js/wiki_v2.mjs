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
            hierarchy: undefined,
            selectedArticle: undefined,
            selectedHierarchyElement: undefined,
        }
    },
    async created() {
        const hierarchyFromServer = await Hierarchy.loadListWithQuery('SELECT * FROM Hierarchy ORDER BY Title')
        for (const hierarchyElement of hierarchyFromServer) {
            if (hierarchyElement.ParentId) {
                const parentElement = hierarchyFromServer.find(element => element.Id === hierarchyElement.ParentId)
                if (!parentElement.children) {
                    parentElement.children = []
                }
                parentElement.children.push(hierarchyElement)
            }
        }
        this.hierarchy = hierarchyFromServer.filter(element => !element.ParentId)
    },
    methods: {
        async handleHierarchyElementClicked(hierarchyElement) {
            if (this.selectedHierarchyElement) {
                this.selectedHierarchyElement.isSelected = false
            }
            hierarchyElement.isSelected = true
            this.selectedHierarchyElement = hierarchyElement
            await this.loadArticle()
        },
        async loadArticle() {
            this.selectedArticle = await Article.loadFromDatabase(this.selectedHierarchyElement.ArticleId)
        }
    }
}

Vue.createApp(vueApp).mount('body')

/*
TODO:
- Selektion merken
- Aktualisieren
- Neu
- Umbenennen
- Abbrechen
- Speichern
- Löschen
- Verschieben

- Seiten private machen
*/