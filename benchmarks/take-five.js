const five = require('take-five')
const server = five()
server.get('/', (req, res) => res.send({ hello: 'world' }))
server.listen(3000)
