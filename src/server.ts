import express, { Express, Request,  Response } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";

import {connect, SqliteSession, SqliteUserRepository, newDB} from "./database"
import { AccountCreateRequest, accountCreateSchema, AccountLoginRequest, accountLoginSchema, AccountLogoutRequest, sessionSchema } from "./models/accountRequest";
import { comparePassword, hashPassword } from "./auth";
import { checkauth } from "./middleware/authMiddleware";

dotenv.config()

const SESSION_COOKIE = "SESSION_ID";

const cookieSecret = process.env.COOKIE_SECRET;

if (cookieSecret === undefined){
  console.error("Must have a cookie secret")
  process.exit(1);
}

const USERS_DB = "./users.sqlite";

const PORT = process.env.PORT || 3000;
const app: Express = express();

app.use(cookieParser(cookieSecret));
app.use(cors());
app.use(bodyParser.json());
app.use(checkauth)

app.get("/signin", async (req: Request, res: Response) => {
  let requestData: AccountLoginRequest;
  try{
    requestData = accountLoginSchema.parse(req.body);
  } catch(e){
    return await res.status(404).json({
      error: "Unable to parse body"
    })
  }
  const db = await connect(USERS_DB);
  const userRepo = new SqliteUserRepository(db);

  try{
    const user = await userRepo.getByEmail(requestData.email);
    if (user === undefined){
      return await res.status(400).json({
        error: "User does not exist"
      })
    }
    const passwordsMatch = await comparePassword(requestData.password, user.hashedPassword);
    if (!passwordsMatch){
      return await res.status(400).json({
        error: "Password mismatch",
      });
    }
    
    const sessions = new SqliteSession(db);
    const sessionId = await sessions.create(user.id);
    const maxAge = 24 * 3600 * 1000
    res.cookie(SESSION_COOKIE, sessionId, {
      maxAge: maxAge,
      expires: new Date(Date.now() + maxAge)
    });

    return await res.status(200).json({
      user: user.id,
    });
  } catch(e){
    return await res.status(400).json({
      error: e,
    })
  }
});

app.get("/logout", async (req: Request, res: Response) => {
  let session_id: AccountLogoutRequest
  try{
    session_id = sessionSchema.parse(req.body)
  } catch(e){
    return await res.status(400).json({
      "error": "Unable to parse request body",
    })
  }
  const db = await connect(USERS_DB);
  const sessionRepo = new SqliteSession(db);
  const success = await sessionRepo.remove(session_id.sessionId)

  if (success > 0){
    return await res.status(200)
  } else{
    return await res.status(500).json({
      "error": `no session was found with id: ${session_id}`
    })
  }
});

app.post("/register", async (req: Request, res: Response) => {
  let requestData: AccountCreateRequest;
  try{
    requestData = accountCreateSchema.parse(req.body);
  } catch(e){
    return await res.status(404).json({
      error: "Unable to parse body"
    })
  }

  const db = await connect(USERS_DB);
  const userRepo = new SqliteUserRepository(db);

  const hashedPass = await hashPassword(requestData.password)

  try{
    const newUser = {
      ...requestData,
      id: 0,
      hashedPassword: hashedPass,
    }
    const user = await userRepo.create(newUser);

    const sessions = new SqliteSession(db);
    const sessionId = await sessions.create(user.id);
    const maxAge = 24 * 3600 * 1000
    res.cookie(SESSION_COOKIE, sessionId, {
      maxAge: maxAge,
      expires: new Date(Date.now() + maxAge)
    });
    

    return await res.status(200).json({
      id: user.id,
    })
  } catch(e){
    return await res.status(400).json({
      error: e,
    })
  }
});

async function start(): Promise<void> {
  try{
    const db = await connect(USERS_DB);
    newDB(db);
    app.listen(PORT, () => {
      console.log(`[server]: Server is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start()