export default {

    Wiki: {

        Article: {
            Content: 'TEXT',
        },

        Hierarchy: {
            ArticleId: 'TEXT REFERENCES Article(Id) ON DELETE CASCADE',
            LastEditedAt: 'INTEGER',
            LastEditedBy: 'TEXT',
            ParentId: 'TEXT REFERENCES Hierarchy(Id) ON DELETE CASCADE',
            Title: 'TEXT',
        },

    },

}