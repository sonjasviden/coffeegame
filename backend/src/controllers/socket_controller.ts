import Debug from 'debug'
const debug = Debug('chat:socket_controller')

import { ClientToServerEvents, GetGameroomResultLobby, ServerToClientEvents, UserWonResult } from '../types/shared/SocketTypes'
import { Socket } from 'socket.io'
import { io } from '../../server'
import { createUser, getUser, updateUser, updateReactionTime, updateScore, disconnectUser } from '../service/user_service'
import { checkAvailableRooms, checkPlayerStatus, calculateReactionTime, randomiseDelay } from './room_controller'
import { getRoom, updateRounds, updateUserConnected, getOngoingGames, disconnectGameroom } from '../service/gameroom_service'
import { createResult, getResults } from '../service/result_service'
import { calculateTotalReactionTime } from './user_controller'

export const handleConnection = (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    debug('A user connected', socket.id)

    // Listen for user created
    socket.on('userJoin', async (user) => {

        // Create the incoming user in the database 
        await createUser(user)

        // Get the id of the Gameroom user are supposed to enter
        const availableRoomId = await checkAvailableRooms(user)
        if (!availableRoomId) {
            return
        }

        // Connect user to gameroom 
        await updateUser(user, availableRoomId)

        // Add user to gameroom available
        socket.join(availableRoomId)

        // Check if there is an player waiting or not, returns true/false
        const playerWaiting = await checkPlayerStatus()
        if (playerWaiting && availableRoomId) {
            // Emit playerWaiting to the client
            io.in(availableRoomId).emit('playerWaiting', user)
        } else {
            // Emit playerReady to the client
            io.in(availableRoomId).emit('playerReady', user)
        }
    })

    //Listen for when user disconnects
    socket.on('disconnect', async () => {
        const user = await getUser(socket.id)
        if (user && user?.gameroomId) {
            const room = await getRoom(user?.gameroomId)

            if (room) {
                await disconnectUser(user.id)
                io.in(room?.id).emit('userDisconnected', user)

                const room2 = await getRoom(user?.gameroomId)
                if (room2?.users.length === 1) {
                    await disconnectUser(room2?.users[0].id)
                }

                await disconnectGameroom(room.id)
            }
        }

        const ongoingRooms = await getOngoingGames(true)
        const finishedRooms = await getOngoingGames(false)
        const results = await getResults()

        const result: GetGameroomResultLobby = {
            success: true,
            roomsOngoing: ongoingRooms,
            roomsFinished: finishedRooms,
            results: results
        }
        socket.broadcast.emit('getInfoToLobby', result)
    })

    // Start game
    socket.on('startGame', async (callback) => {
        // Get the current gameroom and send back to client in callback
        const user = await getUser(socket.id)
        const gameroomId = user?.gameroomId

        if (gameroomId) {
            const room = await getRoom(gameroomId)

            if (room) {
                callback({
                    success: true,
                    data: {
                        name: room?.name,
                        users: room?.users,
                        rounds: room?.rounds
                    }
                })
            }

            // Get users in room to send with showCup event
            let userArr = room?.users.filter(user => user.nickname)

            // Randomise position
            let x = Math.floor(Math.random() * 10) + 1
            let y = Math.floor(Math.random() * 10) + 1

            // Randomise delay 
            const delay = randomiseDelay()

            // Tell client the game is ready to start
            setTimeout(() => {
                delay * 1000
                io.in(gameroomId).emit('showCup', x, y, userArr!)
            },)
        }
    })

    // Listen for cup clicked, recieve current time cup was clicked
    socket.on('cupClicked', async (reactionTime, rounds, callback) => {
        // Get the current gameroomId
        const user = await getUser(socket.id)
        const gameroomId = user?.gameroomId
        if (gameroomId) {
            // Get reactiontime from client and calculate from 00 : 00 : 00 to 00.0
            const reactionTimeTotal = calculateReactionTime(reactionTime)

            // Update user with rounds and reactiontime in DB 
            await updateReactionTime(socket.id, reactionTimeTotal)
            await updateRounds(gameroomId, rounds)

            // Get the room and the users who answered
            const room = await getRoom(gameroomId)
            const usersAnswered = room?.users.filter(user => user.reactionTime)

            // If both users answered, send new positions if rounds <= 10 
            if (usersAnswered?.length === 2) {
                let usersArr = usersAnswered?.filter(user => user.reactionTime)

                // Randomise position
                let x = Math.floor(Math.random() * 10) + 1
                let y = Math.floor(Math.random() * 10) + 1

                // Randomise delay 
                const delay = randomiseDelay()

                if (rounds <= 10) {
                    setTimeout(() => {
                        io.in(gameroomId).emit('showCup', x, y, usersArr)
                    }, delay * 1000)
                } else {
                    // Update gameroom.userConnected to false
                    await updateUserConnected(gameroomId)

                    // If game is over (10 rounds), emit gameOver
                    io.in(gameroomId).emit('bothAnswered', true, usersArr)
                    io.in(gameroomId).emit('gameOver', usersArr)
                }

                // If game rounds is less than 10 - Unset reactiontime in DB
                usersArr.forEach(async (user) => {
                    await updateReactionTime(user.id, 0)
                })

                // Send callback with users who answered
                callback({
                    success: true,
                    data: usersArr
                })

                // Emit that both has answered, so that timers can update
                io.in(gameroomId).emit('bothAnswered', true, usersArr)

            } else if (usersAnswered?.length === 1) {
                let user = usersAnswered?.find(user => user.nickname)
                let userArr = usersAnswered.map(user => user)

                // User who answered first is being given a point and updated in DB
                if (user) {
                    if (user.score === null) {
                        user.score = 0
                    }
                    ++user.score
                    await updateScore(user.id, user.score)

                    // Callback with the user who answered to update their timer
                    callback({
                        success: true,
                        data: userArr
                    })
                }
            }
        }

        // ** Emit lobby results each time a score is given ** 
        const ongoingRooms = await getOngoingGames(true)
        const finishedRooms = await getOngoingGames(false)
        const results = await getResults()

        const result: GetGameroomResultLobby = {
            success: true,
            roomsOngoing: ongoingRooms,
            roomsFinished: finishedRooms,
            results: results
        }
        socket.broadcast.emit('getInfoToLobby', result)
    })

    socket.on('getInfoToLobby', async (callback) => {
        // Send back information to the client about the current result
        const ongoingRooms = await getOngoingGames(true)
        const finishedRooms = await getOngoingGames(false)
        const results = await getResults()

        callback({
            success: true,
            roomsOngoing: ongoingRooms,
            roomsFinished: finishedRooms,
            results: results
        })
    })

    // Recieves objects with results from the client
    socket.on('sendResults', async (player1, player2) => {
        // Get the current gameroomId
        const user = await getUser(socket.id)
        const gameroomId = user?.gameroomId
        if (gameroomId) {
            // Gets the average reaction time of each player
            const totalPlayer1 = calculateTotalReactionTime(player1.reactionTimeAvg)
            const totalPlayer2 = calculateTotalReactionTime(player2.reactionTimeAvg)
            let averageArr1: number[] = []
            let averageArr2: number[] = []
            averageArr1.push(totalPlayer1)
            averageArr2.push(totalPlayer2)

            let result: UserWonResult

            // Create result in DB with both users
            if (player1.users && player2.users) {
                await createResult(totalPlayer1, player1.users)
                await createResult(totalPlayer2, player2.users)

                // If player1 won, send back information to the client
                if (player1.users.score || player2.users.score) {
                    if (player1.users.score! > player2.users.score!) {
                        result = {
                            success: true,
                            data: {
                                reactionTimeAvg: averageArr1,
                                users: player1.users
                            }
                        }
                        io.in(gameroomId).emit('showResults', result)
                        // If player2 won, send back information to the client
                    } else if (player1.users.score! < player2.users.score!) {
                        result = {
                            success: true,
                            data: {
                                reactionTimeAvg: averageArr2,
                                users: player2.users
                            }
                        }
                        io.in(gameroomId).emit('showResults', result)
                        // If tie, send back message
                    } else {
                        result = {
                            success: false,
                            data: null,
                            message: 'Oavgjort'
                        }
                        io.in(gameroomId).emit('showResults', result)
                    }
                }
            }
        }

        // ** Emit lobby results each time a score is given ** 
        const ongoingRooms = await getOngoingGames(true)
        const finishedRooms = await getOngoingGames(false)
        const results = await getResults()

        const result: GetGameroomResultLobby = {
            success: true,
            roomsOngoing: ongoingRooms,
            roomsFinished: finishedRooms,
            results: results
        }
        socket.broadcast.emit('getInfoToLobby', result)
    })
}
