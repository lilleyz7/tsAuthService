import {z} from "zod";

export const accountCreateSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  })

  export const accountLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  })

  export const sessionSchema = z.object({
    sessionId: z.string(),
  })
  
export type AccountCreateRequest = z.infer<typeof accountCreateSchema>;
export type AccountLoginRequest = z.infer<typeof accountLoginSchema>;
export type AccountLogoutRequest = z.infer<typeof sessionSchema>;
export type SessionRequest = z.infer<typeof sessionSchema>;