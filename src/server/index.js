const express = require('express')
const app = express()
const http = require("http")
const socketIo = require("socket.io")
const server = http.createServer(app)


const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{
	console.log("Listening to port: " + PORT )
})

const io = module.exports.io = socketIo(server)

const SocketManager = require('./SocketManager')

app.use( express.static(__dirname + '/../../build'))
io.on('connection', SocketManager)

