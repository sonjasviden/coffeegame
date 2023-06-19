/**
 * User controller
 */

/**
 * Sums the number in an array 
 * @param playerArr to sum
 * @returns value in 0.0 format
 */
export const calculateTotalReactionTime = (playerArr: number[]) => {
    let totalReactionTime: number = 0
    if (playerArr.length === 10) {
        for (let i = 0; i < playerArr.length; i++) {
            totalReactionTime += playerArr[i]
        }
    }
    let sum = (totalReactionTime / 10)
    return Math.round(sum * 10) / 10
}