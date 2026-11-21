
import pool from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class UserService {

    addUser = async (email, password) => {
        const query = `
            INSERT INTO users (email, password)
            VALUES ($1, $2)
            RETURNING id, email, created_at
        `;

        const { rows } = await pool.query(query, [email, password]);

        return rows[0];
    };

    updateUser = async (id, email, password) => {
        const query = `
            UPDATE users
            SET email = $1, password = $2
            WHERE id = $3
            RETURNING id, email, created_at
        `;

        const { rows } = await pool.query(query, [email, password, id]);

        return rows[0] ?? null;
    };

    deleteUser = async (id) => {
        const query = `
            DELETE FROM users
            WHERE id = $1
            RETURNING id
        `;

        const { rows } = await pool.query(query, [id]);

        return rows[0] ?? null;
    };

    getUsers = async () => {
        const query = `
            SELECT id, email, created_at
            FROM users
            ORDER BY id
        `;

        const { rows } = await pool.query(query);

        return rows;
    };

    getUserById = async (id) => {
        const query = `
            SELECT id, email, created_at
            FROM users
            WHERE id = $1
        `;

        const { rows } = await pool.query(query, [id]);

        return rows[0] ?? null;
    };

    getUserByEmail = async (email) => {
        if (typeof email !== 'string' || !email.trim()) {
            throw new Error('Invalid email');
        }

        const query = `
            SELECT id, email, password, created_at
            FROM users
            WHERE email = $1
        `;

        const { rows } = await pool.query(query, [email]);

        return rows[0] ?? null;
    };

    bcryptPassword = (password) => {
        return bcrypt.hash(password, 10);
    };

    bcryptCompare = (password, hashedPassword) => {
        return bcrypt.compare(password, hashedPassword);
    };

    jwtToken = (user) => {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        return jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    };

    jwtVerify = (token) => {
        return jwt.verify(token, process.env.JWT_SECRET);
    };
}

export default new UserService;