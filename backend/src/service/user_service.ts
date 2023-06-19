/**
 * User service
 */

import prisma from '../prisma'
import { GameRoom, User } from '../types/shared/SocketTypes'

/**
 * Get one user 
 */
export const getUser = async (socketId: string) => {
    return await prisma.user.findUnique({
        where: {
            id: socketId
        }
    })
}

/**
 * Get users in Gameroom
 */
export const getUsersInGameroom = async (gameroom: GameRoom) => {
    return await prisma.user.findMany({
        where: {
            id: gameroom.id
        }
    })
}

/**
 * Create user with id, nickname, without a GameroomId
 */
export const createUser = async (user: User) => {
    return await prisma.user.create({
        data: {
            id: user.id,
            nickname: user.nickname,
            score: 0
        }
    })
}

/**
 * Update user with GameroomId
 */
export const updateUser = async (user: User, gameroomId: string) => {
    return await prisma.user.update({
        where: {
            id: user.id
        }, data: {
            gameroomId
        }
    })
}

/**
 * Update user with ReactionTime
 */
export const updateReactionTime = async (userId: string, reactionTime: number) => {
    return await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            reactionTime
        }
    })
}

/**
 * Update user with score
 */
export const updateScore = async (userId: string, score: number) => {
    return await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            score
        }
    })
}

/**
 * DELETE user from DB
 */
export const disconnectUser = async (userId: string) => {
    await prisma.user.deleteMany({
        where: {
            id: userId,
            gameroom: {
                rounds: {
                    lt: 10
                }
            }
        }
    })
}