import pool from "../config/database.js";
import UserService from "./userService.service.js";

class ProfileService {
    create = async (data) => {
        const query = `
          INSERT INTO profiles (user_id, username, full_name, bio, date_of_birth) VALUES ($1, $2, $3, $4, $5) RETURNING *
        `;
        const values = [data.user_id, data.username, data.full_name, data.bio ?? null, data.date_of_birth];
        const { rows } = await pool.query(query, values); 
        return rows[0];  
    }

    upload_profile_image = async (userId, imageUrls) => {
        const query = `
          UPDATE profiles SET profile_picture = $1 WHERE user_id = $2 RETURNING *
        `;
        const { rows } = await pool.query(query, [imageUrls, userId]);
        return rows[0];  
    }

    upload_cover_image = async (userId, imageUrls) => {
        const query = `
          UPDATE profiles SET cover_picture = $1 WHERE user_id = $2 RETURNING *
        `;
        const { rows } = await pool.query(query, [imageUrls, userId]);
        return rows[0];  
    }

    get = async (userId) => {
        const query = `
          SELECT * FROM profiles WHERE user_id = $1
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows[0];  
    }

    getAll = async () => {
        const query = `
          SELECT * FROM profiles
        `;
        const { rows } = await pool.query(query);
        return rows;  
    }

    update = async (userId, data) => {
        const query = `
          UPDATE profiles 
          SET full_name = COALESCE($1, full_name), bio = COALESCE($2, bio), date_of_birth = COALESCE($3, date_of_birth), username = COALESCE($4, username) 
          WHERE user_id = $5 
          RETURNING *
        `;
        const values = [data.full_name ?? null, data.bio ?? null, data.date_of_birth ?? null, data.username ?? null, userId];
        const { rows } = await pool.query(query, values);
        
        if (rows.length === 0) {
            throw new Error('Profile not found');
        }

        return rows[0];  
    }
}

export default new ProfileService();