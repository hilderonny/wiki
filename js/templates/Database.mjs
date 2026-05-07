export default {

    Wiki: {

        Article: {
            Content: 'TEXT',
        },

        Hierarchy: {
            ArticleId: 'TEXT REFERENCES Article(Id) ON DELETE CASCADE',
            IsPrivate: 'INTEGER',
            LastEditedAt: 'INTEGER',
            LastEditedBy: 'TEXT',
            OwnerId: 'TEXT',
            ParentId: 'TEXT REFERENCES Hierarchy(Id) ON DELETE CASCADE',
            Title: 'TEXT',
        },

    },

}