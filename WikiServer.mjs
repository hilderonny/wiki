import ArrangeServer from '@hilderonny/arrange'

// Server vorbereiten
const server = new ArrangeServer({
    crtFile: './server.crt',
    dataPath: './data',
    htmlPaths: { 
        '/' : './html',
    },
    keyFile: './server.key',
    name: 'Wiki',
    port: 8080,
    useSSL: true
})

// Server starten
server.start()