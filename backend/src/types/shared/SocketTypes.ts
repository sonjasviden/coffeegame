export interface ServerToClientEvents {
    showCup: (x: number, y: number, usersArr: User[]) => void
    playerWaiting: (user: User) => void
    playerReady: (user: User) => void
    playersAnswered: (clicks: boolean) => void
    gameOver: (users: User[]) => void
    userDisconnected: (user: User) => void
    getInfoToLobby: (result: GetGameroomResultLobby) => void
    bothAnswered: (bothAnswred: boolean, user: User[]) => void
    showResults: (result: UserWonResult) => void
}

export interface ClientToServerEvents {
    userJoin: (user: User) => void
    startGame: (callback: (result: GetGameroomResult) => void) => void
    cupClicked: (
        reactionTime: string,
        rounds: number,
        callback: (result: GetUserResult) => void
    ) => void
    getInfoToLobby: (callback: (result: GetGameroomResultLobby) => void) => void
    sendResults: (player1: Result, player2: Result) => void
}

export type User = {
    id: string
    nickname: string
    reactionTime: number | null
    gameroomId?: string | null
    score?: number | null
}

export type GameRoom = {
    id?: string
    name: string
    users: User[] | null
    rounds: number
}

export type Result = {
    reactionTimeAvg: number[]
    users: User | null
}


export interface ResultLobby {
    reactionTimeAvg: number[],
    users: User[] | null
}

export interface GetGameroomResult {
    success: boolean,
    data: GameRoom | null
}

export interface GetGameroomResultLobby {
    success: boolean,
    roomsOngoing: GameRoom[] | null
    roomsFinished: GameRoom[] | null
    results: ResultLobby[] | null
}

export interface GetUserResult {
    success: boolean,
    data: User[] | null
}
export interface UserWonResult {
    success: boolean,
    data: Result | null,
    message?: string
}

