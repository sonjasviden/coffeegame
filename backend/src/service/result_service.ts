/**
 * Result service
 */

import prisma from '../prisma'
import { User } from '../types/shared/SocketTypes'

/**
 * Get all results and their users 
 */
export const getResults = async () => {
    return await prisma.result.findMany({
        take: 20,
        orderBy: {
            reactionTimeAvg: 'asc'
        },
        include: {
            users: true
        }
    })
}

/**
 * Create result with reaction time average and user
 */
export const createResult = async (reactionTime: number, user: User) => {
    return await prisma.result.create({
        data: {
            reactionTimeAvg: reactionTime,
            users: {
                connect: {
                    id: user.id
                }
            }
        }
    })
}