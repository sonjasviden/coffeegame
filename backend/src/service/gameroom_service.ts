/**
 * Gameroom service
 */

import prisma from '../prisma'
import { GameRoom, User } from '../types/shared/SocketTypes'

/**
 * Get all rooms and their users 
 */
export const getRooms = async () => {
    return await prisma.gameroom.findMany({
        include: {
            users: true
        }
    })
}
/**
 * Get all rooms that has usersconnected true/false
 */
export const getOngoingGames = async (connected: boolean) => {
    return await prisma.gameroom.findMany({
        take: 10,
        where: {
            userConnected: connected
        }, include: {
            users: true
        }
    })
}

/**
 * Get a specific room by gameroomId
 */
export const getRoom = async (gameroomId: string) => {
    return await prisma.gameroom.findUnique({
        where: {
            id: gameroomId
        }, include: {
            users: true
        }
    })
}

/**
 * Create room 
 */
export const createRoom = async (room: GameRoom, user: User) => {
    return await prisma.gameroom.create({
        data: {
            name: room.name,
            userConnected: true,
            rounds: room.rounds,
            users: {
                connectOrCreate: {
                    where: { id: user.id },
                    create: {
                        id: user.id,
                        nickname: user.nickname,
                        score: user.score
                    }
                }
            }
        }
    })
}

/**
 * Update rounds in a gameroom
 */
export const updateRounds = async (gameroomId: string, rounds: number) => {
    return await prisma.gameroom.update({
        where: {
            id: gameroomId
        },
        data: {
            rounds: rounds
        }
    })
}

/**
 * Update when 10 rounds is done from usersconnected true to false
 */
export const updateUserConnected = async (gameroomId: string) => {
    return await prisma.gameroom.update({
        where: {
            id: gameroomId
        },
        data: {
            userConnected: false
        }
    })
}

/**
 * Disconnect room when one player disconnects early before 10 rounds are played
 */
export const disconnectGameroom = async (gameroomId: string) => {
    await prisma.gameroom.deleteMany({
        where: {
            id: gameroomId,
            rounds: {
                lt: 10
            }
        }
    })
}