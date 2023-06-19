import app from './src/app'
import http from 'http'
import * as dotenv from 'dotenv'
import { Server } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from './src/types/shared/SocketTypes'
import { handleConnection } from './src/controllers/socket_controller'

dotenv.config()
const PORT = process.env.PORT || 3000

// HTTP & Socket.IO server
const server = http.createServer(app)
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
        origin: '*',
        credentials: true
    }
})

// Incoming Socket.IO connection
io.on('connection', (socket) => {
    handleConnection(socket)
})

// Listening on server start
server.listen(PORT)
server.on('listening', () => {
    console.log(`Server started on http://localhost:${PORT}`)
})