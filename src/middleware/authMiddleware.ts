import { NextFunction, Request, Response } from "express";
import { SessionRequest, sessionSchema } from "../models/accountRequest";
import { connect, SqliteSession } from "../database";

const USERS_DB = "../users.sqlite";

export async function checkauth(req: Request, res: Response, next: NextFunction){
    let sessionid: SessionRequest;
    try{
        sessionid = sessionSchema.parse(req.body);
    } catch(e){
        return await res.status(401).json({
            "error": e
        })
    }

    const db = await connect(USERS_DB)
    const sessionRepo = await new SqliteSession(db)

    try{
        const user = sessionRepo.get(sessionid.sessionId)
        if (user ===  undefined){
            return await res.status(401).json({
                "error": "Session id does not match any user"
            })
        }

        next();
    } catch(e){
        return await res.status(401).json({
            "error": e,
        })
    }
}