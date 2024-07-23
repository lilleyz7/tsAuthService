import bcrypt from "bcrypt";

const saltRounds = 10;

export class HashedPassword{
    constructor(readonly hashed: string){

    }
}


export async function hashPassword(plainText: string): Promise<HashedPassword>{
    return await new Promise((resolve, reject) => {
    bcrypt.hash(plainText, saltRounds, (err, hash) => {
        if (err !== undefined){
            reject(err);
        } else{
            resolve(new HashedPassword(hash));
        }
    })       
})
}

export async function comparePassword(password: string, hash: HashedPassword): Promise<boolean>{
    return await bcrypt.compare(password, hash.hashed)
}
