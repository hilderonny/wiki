const NavigationElement = {
    components: {},
    props: {
        hierarchyElement: Object,
    },
    emits: [
        'hierarchyElementClicked'
    ],
    template: `
        <details :class="{ empty: !hierarchyElement.children }" :open="hierarchyElement.isOpen" @toggle="(event) => { $emit('hierarchyElementToggled', hierarchyElement, event.target.open) }">
            <summary><label :class="{ selected: hierarchyElement.isSelected }" @click="$emit('hierarchyElementClicked', hierarchyElement)">{{ hierarchyElement.Title }}</label></summary>
            <navigation-element
                v-if="hierarchyElement.children" 
                v-for="childElement in hierarchyElement.children" 
                :hierarchy-element="childElement"
                @hierarchy-element-clicked="(childElement) => { $emit('hierarchyElementClicked', childElement) }"
                @hierarchy-element-toggled="(childElement, isOpen) => { $emit('hierarchyElementToggled', childElement, isOpen) }"
            ></navigation-element>
        </div>
    `,
}
NavigationElement.components.NavigationElement = NavigationElement

export default NavigationElement