import UserService from '../services/userService.service.js';

export const IsAuthenticated = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Assuming the token is sent in the Authorization header as "Bearer <token>"
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const decoded = UserService.jwtVerify(token);

        if(!decoded) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = decoded.id;
        req.user = decoded;
        req.userId = userId;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ message: 'Unauthorized' });
    }
}