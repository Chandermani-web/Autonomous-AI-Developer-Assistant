import UserService from '../services/userService.service.js';
import redisClient from '../config/caching.js';

class UserController {
    // Cache only public user fields
    cacheUser = async (user) => {
        if (!user) return;

        try {
            await redisClient.set(`user:${user.id}`, JSON.stringify(user), { EX: 3600 });
        } catch (error) {
            console.error('Redis cache write failed:', error);
        }
    };

    invalidateUserCaches = async (id = null) => {
        try {
            const keys = ['users'];

            if (id !== null) {
                keys.push(`user:${id}`);
            }

            await redisClient.del(keys);
        } catch (error) {
            console.error('Redis cache invalidation failed:', error);
        }
    };

    register = async (req, res) => {
        try {
            let { email, password } = req.body;

            if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
                return res.status(400).json({ message: 'Please provide email and password' });
            }

            email = email.trim().toLowerCase();

            const hashedPassword = await UserService.bcryptPassword(password);
            const user = await UserService.addUser(email, hashedPassword);

            await this.invalidateUserCaches();
            await this.cacheUser(user);

            const token = UserService.jwtToken(user);

            return res.status(201).json({ message: 'User registered successfully', user, token });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ message: 'Email already registered' });
            }

            console.error('Registration failed:', error);

            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    login = async (req, res) => {
        try {
            let { email, password } = req.body;

            if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
                return res.status(400).json({ message: 'Please provide email and password' });
            }

            email = email.trim().toLowerCase();

            const existingUser = await UserService.getUserByEmail(email);

            if (!existingUser) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isPasswordValid = await UserService.bcryptCompare(password, existingUser.password);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const user = { id: existingUser.id, email: existingUser.email, created_at: existingUser.created_at };

            await this.cacheUser(user);

            const token = UserService.jwtToken(user);

            return res.status(200).json({ message: 'Login successful', user, token });
        } catch (error) {
            console.error('Login failed:', error);

            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    getUsers = async (req, res) => {
        try {
            const cachedUsers = await redisClient.get('users');

            if (cachedUsers !== null) {
                return res.status(200).json({ message: 'Users retrieved from cache', users: JSON.parse(cachedUsers) });
            }

            const users = await UserService.getUsers();

            try {
                await redisClient.set('users', JSON.stringify(users), { EX: 3600 });
            } catch (error) {
                console.error('Redis cache write failed:', error);
            }

            return res.status(200).json({ message: 'Users retrieved from database', users });
        } catch (error) {
            console.error('Fetching users failed:', error);

            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    getUsersById = async (req, res) => {
        try {
            const { id } = req.params;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const cacheKey = `user:${id}`;
            const cachedUser = await redisClient.get(cacheKey);

            if (cachedUser !== null) {
                return res.status(200).json({ message: 'User retrieved from cache', user: JSON.parse(cachedUser) });
            }

            const user = await UserService.getUserById(id);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            await this.cacheUser(user);

            return res.status(200).json({ message: 'User retrieved from database', user });
        } catch (error) {
            console.error('Fetching user failed:', error);

            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    updateUser = async (req, res) => {
        try {
            const { id } = req.params;
            let { email, password } = req.body;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            email = email.trim().toLowerCase();

            const hashedPassword = await UserService.bcryptPassword(password);
            const user = await UserService.updateUser(id, email, hashedPassword);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            await this.invalidateUserCaches(id);
            await this.cacheUser(user);

            return res.status(200).json({ message: 'User updated successfully', user });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ message: 'Email already registered' });
            }

            console.error('Updating user failed:', error);

            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    deleteUser = async (req, res) => {
        try {
            const { id } = req.params;

            if (typeof id !== Number || id <= 0) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const deletedUser = await UserService.deleteUser(id);

            if (!deletedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            await this.invalidateUserCaches(id);

            return res.status(200).json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Deleting user failed:', error);

            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };
}

export default new UserController();