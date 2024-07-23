import { AsyncDatabase } from "promised-sqlite3";
import {v4 as uuidV4 } from "uuid";
import { HashedPassword } from "./auth";
import { RunResult } from "sqlite3";

export interface User{
    id: number;
    email: string;
    hashedPassword: HashedPassword;
}

export interface UserRepository{
    create(user: User): Promise<User>;
    getByEmail(email: string): Promise<User | undefined>;
    getById(userId: number): Promise<User | undefined>;
} 

export class SqliteUserRepository implements UserRepository{
    constructor(private readonly db: AsyncDatabase){

    }

    async create(user: User): Promise<User>{
        const user_id: {id: number} = await this.db.get(
            `INSERT INTO users (email, password) VALUES (?, ?) RETURNING id`,
            [user.email, user.hashedPassword.hashed]
        )
        return {
            ...user,
            id: user_id.id
        }
    }
    async getByEmail(email: string): Promise<User | undefined>{
        return await this.db.get(`SELECT * FROM users WHERE email = ?`, [email])
    }
    async getById(userId: number): Promise<User | undefined>{
        return await this.db.get(`SELECT * FROM users WHERE id = ?`, [userId])

    }
}

export class SqliteSession{
    constructor(private readonly db: AsyncDatabase){

    }

    async create(user_id: number): Promise<string>{
        const sessionId = uuidV4();
        await this.db.run(
            `INSERT INTO sessions(session_id, user_id) VALUES (?, ?)`,
            [sessionId, user_id]
        )
        return sessionId
    }

    async get(sessionId: string): Promise<User | undefined>{
        const userId: {user_id: number} | undefined = await this.db.get(
            `SELECT user_id FROM sessions WHERE session_id = ?`, sessionId
        )
        if (userId === undefined){
            return undefined;
        }
        const users = new SqliteUserRepository(this.db);
        return await users.getById(userId.user_id)
    }

    async remove(sessionId: string): Promise<number>{
        const success = await this.db.run(`DELETE FsROM sessions WHERE session_id = ?`, sessionId)
        return success.changes
    }
}


export async function connect(connectionString: string): Promise<AsyncDatabase>{
    return await AsyncDatabase.open(connectionString);
}

export async function newDB(db: AsyncDatabase): Promise<void>{
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions(
            session_id UUID PRIMARY KEY,
            user_id INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);
}