import express from "express"

const router = express.Router()

/**
 * GET /
 */
router.get('/', (req, res) => {
    res.send({
        message: "I AM COFFEE GAME, BEEP BOOP"
    })
})

export default router