import './assets/scss/style.scss'
import { io, Socket } from 'socket.io-client'
import { ClientToServerEvents, User, ServerToClientEvents, GetGameroomResultLobby, Result, UserWonResult } from '@backend/types/shared/SocketTypes'

// Connect to Socket.IO server
const SOCKET_HOST = import.meta.env.VITE_APP_SOCKET_HOST
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_HOST)

// Get the elements for stopwatches
const player1NameEl = document.querySelector('#player-1-name')
const player2NameEl = document.querySelector('#player-2-name')
let player1Clock = document.querySelector('#player-1-clock') as HTMLElement
let player2Clock = document.querySelector('#player-2-clock') as HTMLElement
let player1AnswerClock = document.querySelector('#player-1-answer-clock') as HTMLElement
let player2AnswerClock = document.querySelector('#player-2-answer-clock') as HTMLElement

// Get element for coffee cup
const coffeeGrid = document.querySelector('.coffee-grid') as HTMLDivElement

// Set values for rounds
let rounds = 1
let roundsTotal = 10

// Set empty arrays to push and calculate average reaction times
let player1TimeArr: number[] = []
let player2TimeArr: number[] = []

// Listen for connection
socket.on('connect', () => {
    console.log('Connected to the server', socket.id)
})

// Listen for disconnect
socket.on('disconnect', () => {
    console.log('Disconnected from the server')
})

// Listen for if player waiting
socket.on('playerWaiting', (user) => {
    // Display waiting page
    displayPlayerWaiting(user)
})

// Listen for if player is ready
socket.on('playerReady', () => {
    // Display ready page
    displayPlayerReady()

    // Emit to server that the game is ready to start
    socket.emit('startGame', (gameroom) => {
        document.querySelector('.playerLeft')!.classList.add('hide')

        if (gameroom.data?.users) {
            // Display players name
            document.querySelector('#player-1-name')!.innerHTML = `${gameroom.data?.users[0].nickname}`
            document.querySelector('#player-2-name')!.innerHTML = `${gameroom.data?.users[1].nickname}`
        }
    })
})

// Listen for when cup should show
socket.on('showCup', (x, y, userArr) => {
    const gridX = x
    const gridY = y

    // Remove the answered time and set elements back
    updateScoreAndTimer(userArr)

    // Show coffee cup on randomised position and start timer
    document.querySelector('#game-grid')!.innerHTML = `
    <div class="coffee-grid grid-x-${gridX} grid-y-${gridY}">
    <img src="./src/assets/images/pngegg.png" alt="coffee-cup" id="coffee-virus" class="coffee img-fluid">
    </div>`

    coffeeGrid.innerHTML = `        
        <img src="./src/assets/images/pngegg.png" alt="coffee-cup" id="coffee-virus" class="coffee img-fluid">
     `

    // Start timer for both players
    startTimer()

    // Update rounds
    document.querySelector(".rounds-div")!.textContent = `Runda: ${rounds} / ${roundsTotal}`

    // When coffee cup clicked, emit to server
    document.querySelector('#coffee-virus')?.addEventListener('click', () => {
        rounds++
        // Get the reaction time from the stopwatch
        const reactionTime = document.querySelector('.player-clock')!.innerHTML

        document.querySelector('#game-grid')!.innerHTML = ``

        // Emit that the cup is clicked, get back result of who answered first
        socket.emit('cupClicked', reactionTime, rounds, (userAnswered) => {
            // Update the stopwatches with reactiontimes 
            if (userAnswered.data?.length === 1) {
                if (player1NameEl?.innerHTML === `${userAnswered.data[0].nickname}`) {
                    player1Clock.classList.add('hide-timer')
                    player1AnswerClock.classList.remove('hide-timer')
                    player1AnswerClock.innerText = `${reactionTime}`
                } else if (player2NameEl?.innerHTML === `${userAnswered.data[0].nickname}`) {
                    player2Clock.classList.add('hide-timer')
                    player2AnswerClock.classList.remove('hide-timer')
                    player2AnswerClock.innerText = `${reactionTime}`
                }
            }
        })
    })
})

const hideAndShow = () => {
    document.querySelector('.playerLeft')!.classList.remove('hide')
    document.querySelector('#game-grid')!.classList.add('hide')
}

socket.on('userDisconnected', () => {
    hideAndShow()
    document.querySelector('.playerLeft')!.innerHTML = `
    <h2>Oh No!</h2>
    <p>Din motspelare tröttnade på att spela...</p>
    <button class="goto-start">Gå tillbaka till start?</button>
    `
    resetTimer()
    document.querySelector('.goto-start')!.addEventListener('click', () => {
        document.querySelector('.game-room-container')!.classList.add('hide')
        document.querySelector('.start-container')!.classList.remove('hide')
        window.location.reload()

    })
})

socket.on('bothAnswered', (bothAnswered, usersArr) => {
    updateGameTimers(bothAnswered, usersArr)
})

socket.on('gameOver', (usersArr) => {
    // Emit results objects to server
    sendResultsToServer(usersArr)
})

socket.on('showResults', result => {
    displayGameOverPage(result)
})

socket.on('getInfoToLobby', (result) => {
    updateLobby(result)
})

// ** LOBBY SECTION ** 
document.querySelector('.to-lobby-btn')!.addEventListener('click', () => {
    // ** Hide start-view and display lobby **
    document.querySelector('.lobby-container')!.classList.remove('hide')
    document.querySelector('.start-container')!.classList.add('hide')

    // Get result from DB to print out information in lobby
    socket.emit('getInfoToLobby', (result) => {
        updateLobby(result)
    })
})

/**
 * Displays updated timers with players reactiontimes and resets timer
 * @param userArr what users to update
 */
const updateScoreAndTimer = (userArr: User[]) => {
    // Remove the answered time and set elements back
    player1AnswerClock.classList.add('hide-timer')
    player1Clock.classList.remove('hide-timer')
    player2AnswerClock.classList.add('hide-timer')
    player2Clock.classList.remove('hide-timer')

    if (player1NameEl?.innerHTML === `${userArr[0].nickname}`) {
        document.querySelector('#player-1-score')!.innerHTML = `${userArr[0].score}`
    } else (player2NameEl?.innerHTML === `${userArr[1].nickname}`)
    document.querySelector('#player-2-score')!.innerHTML = `${userArr[1].score}`

    resetTimer()
}

/**
 * Create objects with players results and emit to server
 * @param users array of users to send result of
 */
const sendResultsToServer = (users: User[]) => {
    // uppdatera player 1 och 2
    const player1 = users.find(user => user.nickname === player1NameEl?.innerHTML)
    const player2 = users.find(user => user.nickname === player2NameEl?.innerHTML)

    let player1Result: Result = {
        reactionTimeAvg: player1TimeArr,
        users: null
    }

    let player2Result: Result = {
        reactionTimeAvg: player2TimeArr,
        users: null
    }

    if (player1) {
        player1Result = {
            reactionTimeAvg: player1TimeArr,
            users: {
                id: player1.id,
                nickname: player1.nickname,
                reactionTime: player1.reactionTime,
                score: player1.score
            }
        }
    }
    if (player2) {
        player2Result = {
            reactionTimeAvg: player2TimeArr,
            users: {
                id: player2.id,
                nickname: player2.nickname,
                reactionTime: player2.reactionTime,
                score: player2.score
            }
        }
    }
    // Emit result objects to server
    socket.emit('sendResults', player1Result, player2Result)
}

/**
 * Update the stopwatches and add reactiontimes to array
 * @param bothAnswered if both has answered
 * @param users what users are currently playing
 */
const updateGameTimers = (bothAnswered: boolean, users: User[]) => {
    if (bothAnswered) {
        // uppdatera player 1 och 2
        const player1 = users.find(user => user.nickname === player1NameEl?.innerHTML)
        const player2 = users.find(user => user.nickname === player2NameEl?.innerHTML)

        if (player1) {
            player1Clock.classList.add('hide-timer')
            player1AnswerClock.classList.remove('hide-timer')

            if (player1.reactionTime) {
                const reactiontime = calculateReactionTime(player1.reactionTime)
                player1AnswerClock.innerText = `${reactiontime}`
                addReactionTime(player1.reactionTime, player1TimeArr)
            }
        }
        if (player2) {
            player2Clock.classList.add('hide-timer')
            player2AnswerClock.classList.remove('hide-timer')

            if (player2.reactionTime) {
                const reactiontime = calculateReactionTime(player2.reactionTime)
                player2AnswerClock.innerText = `${reactiontime}`
                addReactionTime(player2.reactionTime, player2TimeArr)
            }
        }
    }
}

/**
 * Push reactiontime to array
 * @param reactionTime to push to array
 * @param playerArr what array to push reactiontime to
 */
const addReactionTime = (reactionTime: number, playerArr: number[]) => {
    playerArr.push(reactionTime)
}

document.querySelector('.to-lobby-btn')!.addEventListener('click', () => {
    // ** Hide start-view and display lobby **
    document.querySelector('.lobby-container')!.classList.remove('hide')
    document.querySelector('.start-container')!.classList.add('hide')

    // Get result from DB to print out information in lobby
    socket.emit('getInfoToLobby', (result) => {
        updateLobby(result)
    })
})

// ** Update lobby DOM **
const updateLobby = (result: GetGameroomResultLobby) => {
    document.querySelector('.ongoing-games-column')!.innerHTML = `<h3>Pågående spel</h3>`
    document.querySelector('.recent-games-column')!.innerHTML = `
    <h3>10 senaste matcherna</h3>`
    document.querySelector('.highscore-column')!.innerHTML = `
    <h3>Topp 10 highscores</h3>
`

    // Write out ongoing games with nicknames and scores
    result.roomsOngoing?.forEach(room => {
        if (room.users && room.users.length === 2) {
            document.querySelector('.ongoing-games-column')!.innerHTML += `
                    <li class="ongoing-list">
                        <span>${room.users[0].nickname} | ${room.users[1].nickname}</span>
                        <span>${room.users[0].score} - ${room.users[1].score}</span>
                    </li>
                `
        }
    })

    // Write out top 10 highscores
    result.results?.forEach(result => {
        result.users?.forEach(user => {
            if (user.nickname || result.reactionTimeAvg) {
                document.querySelector('.highscore-column')!.innerHTML += `
                <li class="highscore-list">
                    <span>${user.nickname} | ${result.reactionTimeAvg} </span>
                </li>
            `
            }
        })
    })

    // Write out 10 last games
    result.roomsFinished?.forEach(room => {
        if (room.users && room.users.length === 2) {
            document.querySelector('.recent-games-column')!.innerHTML += `
        <li class="recent-games-list">
            <span>${room.users[0].nickname} | ${room.users[1].nickname}</span>
            <span>${room.users[0].score} - ${room.users[1].score}</span>
        </li>
        `
        }
    })
}

// ** Display game over page ** 
const displayGameOverPage = (result: UserWonResult) => {
    const gameOver = document.querySelector('.gameover-container')

    gameOver!.classList.remove('hide')
    document.querySelector('.game-room-container')!.classList.add('hide')

    gameOver!.innerHTML = `
    <button class="play-again">Play again!</button>
    
    <div class='content'>
        <h2>AND THE WINNER IS......</h2>
        <h4>↓ HOVER ME ↓</h4>
        <div class="letter-image">
            <div class="animated-mail">
                <div class="back-fold"></div>
                <div class="letter">
                    <div class="letter-title">
                        
                    </div>
                </div>
                <div class="top-fold"></div>
                <div class="body"></div>
                <div class="left-fold"></div>
            </div>
            <div class="shadow"></div>
        </div>  
    </div>  
    `

    if (result.message === 'Oavgjort') {
        document.querySelector('.letter-title')!.innerHTML = `
        <h3>Oavgjort</h3>
        `
    } else {
        document.querySelector('.letter-title')!.innerHTML = `
        <h3>${result.data?.users?.nickname}</h3>
        `
    }

    // ** If 'tillbaka till start' pressed, hide lobby and show start-view ** 
    document.querySelector('.play-again')?.addEventListener('click', () => {
        document.querySelector('.gameover-container')!.classList.add('hide')
        document.querySelector('.start-container')!.classList.remove('hide')
        window.location.reload()
    })
}

// ** Display waiting page **
const displayPlayerWaiting = (user: User) => {
    document.querySelector('.waiting-page')!.innerHTML =
        `<h2 class="search-lobby-heading">${user.nickname} väntar på motspelare...</h2>
    <div class="gif-img">
      <iframe src="https://giphy.com/embed/3oriNLCq45I9mdJK1y" class="gif-img" allowFullScreen></iframe>
    </div>
    <h2 class="search-lobby-heading2">Motpelare inte redo...</h2>
    `
}

// ** Display ready page **
const displayPlayerReady = () => {
    document.querySelector('.waiting-page')!.innerHTML =
        `<h2 class="search-lobby-heading">Hittade motspelare! Laddar spel.....</h2>
        <div class="gif-img">
      <iframe src="https://giphy.com/embed/3oriNLCq45I9mdJK1y" class="gif-img" allowFullScreen></iframe>
    </div>
    `

    // Hide the lobby & show the game room after 4sec delay
    setTimeout(() => {
        document.querySelector('.game-room-container')!.classList.remove('hide')
        document.querySelector('.search-lobby-container')!.classList.add('hide')
    }, 4000)
}

// ** Get username and emit to server ** 
document.querySelector('#nickname-form')?.addEventListener('submit', (e) => {
    e.preventDefault()

    // Save nickname and emit to the server
    const user: User = {
        id: socket.id,
        nickname: (document.querySelector('#nickname-input') as HTMLInputElement).value.trim(),
        reactionTime: null,
        score: 0
    }

    // If nothing was entered/created, tell user and return
    if (!user) {
        document.querySelector('.nickname-label')!.innerHTML = 'Skriv in ett nickname'
        return
    }

    // Emit user joined to the server
    socket.emit('userJoin', user)

    // When "Gå till Lobby" button clicked, go to lobby
    document.querySelector('.start-container')!.classList.add('hide')
    document.querySelector('.search-lobby-container')!.classList.remove('hide')
})

// ** If 'tillbaka till start' pressed, hide lobby and show start-view ** 
document.querySelector('.go-back-btn')?.addEventListener('click', () => {
    document.querySelector('.start-container')!.classList.remove('hide')
    document.querySelector('.lobby-container')!.classList.add('hide')
    window.location.reload()
})

// ** Measure reaction time and display timer ** 
let [tenth, seconds, minutes] = [0, 0, 0]
let int: any = null

const startTimer = () => {
    if (int !== null) {
        clearInterval(int)
    }
    int = setInterval(displayTimer, 100)
}

const resetTimer = () => {
    // Clear timer
    clearInterval(int);
    [tenth, seconds, minutes] = [0, 0, 0]
}

const displayTimer = () => {
    tenth += 10;
    if (tenth == 100) {
        tenth = 0;
        seconds++;
        if (seconds == 60) {
            seconds = 0;
            minutes++;
        }
    }

    let m: string | number = minutes < 10 ? '0' + minutes : minutes;
    let s: string | number = seconds < 10 ? '0' + seconds : seconds;
    let t: string | number = tenth < 10 ? '0' + tenth : tenth < 100 ? + tenth : tenth;

    if (player1Clock) player1Clock.innerHTML = ` ${m} : ${s} : ${t}`;
    if (player2Clock) player2Clock.innerHTML = ` ${m} : ${s} : ${t}`;
}

/**
 * Convert time from 00.0 format to 00 : 00 : 00
 * @param time in tenth of seconds 
 */
const calculateReactionTime = (time: number) => {
    let m: string | number = Math.floor(time / 60)
    let s: string | number = Math.floor(time - m)

    let getDecmial = time.toString().indexOf(".")
    let t: string | number = time.toString().substring(getDecmial + 1)

    m = m < 10 ? '0' + m : m
    s = s < 10 ? '0' + s : s
    t = (Number(t) * 10).toString()

    let total = `${m} : ${s} : ${t}`

    return total
}
