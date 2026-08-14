import pool from "../db/database.js";


class TokkenModel{
    async createToken(tokenData){
        const {token, user_id, expires_at} = tokenData;
        const [result] = await pool.execute("INSERT INTO tokens ( token, expires_at, user_id) VALUES (?,?,?);",[token, expires_at, user_id]);
        return result;
    }

    async selectByToken(token){
        const [result] = await pool.execute("select * from tokens where token =?;",[token]);
        return result;
    }

    async deleteToken(token){
        const [result] = await pool.execute("delete from tokens where token=?;",[token]);
        return result;
    }

}

export default new TokkenModel()