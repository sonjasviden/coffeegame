import { getRooms, createRoom } from "../service/gameroom_service"
import { GameRoom, User } from "../types/shared/SocketTypes"

import Debug from "debug"
const debug = Debug('chat:room_controller')

// Globally scoped, so addRoom can be called without reset 
let roomNr = 1

/**
 * Create a new room in db and add to count
 * @param user: the user connected
 * @returns the id of the created room
 */
const addRoom = async (user: User) => {
    // Create a room object
    const newRoom: GameRoom = {
        name: `Gameroom #${roomNr}`,
        users: null,
        rounds: 0,
    }

    // Create a room in db
    const createdRoom = await createRoom(newRoom, user)

    // Add count on roomNr 
    roomNr++

    // Return the id of the createdRoom
    return createdRoom.id
}

/*
 * Check if room exists, or else, create a new room
 * Check if a user is waiting, if not, connect user to a new room
 */
export const checkAvailableRooms = async (user: User) => {
    // Get rooms and their users
    const rooms = await getRooms()

    // If no rooms found, create a new room with users null
    if (rooms.length < 1) return await addRoom(user)
    else {
        // Check if there is a room with one user connected (waiting)
        const nrOfUsersInGameroom = rooms.map(room => room.users.length)
        const availableRoomFound = nrOfUsersInGameroom.find(room => room < 2)

        // If available room found, get the single user and return their gameroomId
        if (availableRoomFound) {
            const users = rooms.map(room => room.users)
            const singleUser = users.find(user => user.length < 2)

            if (singleUser) return singleUser[0].gameroomId
        } else return await addRoom(user)
    }
}

/**
 * Check if there is an player waiting or not
 * @returns playerWaiting true/false
 */
export const checkPlayerStatus = async () => {
    let playerWaiting: Boolean

    // Get rooms and their users
    const rooms = await getRooms()

    // If no rooms found return playerWaiting true
    // If room with one user found, return playerWaiting false
    if (rooms.length < 1) return playerWaiting = true
    else {
        // Check if there is a room with one user connected (waiting)
        const nrOfUsersInGameroom = rooms.map(room => room.users.length)
        const availableRoomFound = nrOfUsersInGameroom.find(room => room < 2)

        if (availableRoomFound) {
            const users = rooms.map(room => room.users)
            const singleUser = users.find(user => user.length < 2)

            if (singleUser) return playerWaiting = true
        } else return playerWaiting = false
    }
}

/**
 * Convert time from 00 : 00 : 00 format to 00.0
 * @param time from stopwatch
 */
export const calculateReactionTime = (time: string) => {
    // Get the values from 00 : 00 : 00 format
    const min = time.slice(0, 3)
    const sec = time.slice(5, 8)
    const tenth = time.slice(10, 12)

    // Add the values to total
    let total: number = 0

    if (min) total = 60 * Number(min)
    if (sec) total = total + Number(sec)
    if (tenth) total = total + (Number(tenth) / 10)

    return total
}

/**
 * Randomise a number to use as delay in setTimeouts
 * @returns a random number between 1 - 5
 */
export const randomiseDelay = () => {
    return Math.floor(Math.random() * 6) + 1
}
