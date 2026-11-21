import ProfileService from "../services/profileService.service.js";
import redisClient from "../config/caching.js";

class ProfileController {
    cacheProfile = async (profile) => {
        if (!profile) return;

        try {
            await redisClient.set(`profile:${profile.user_id}`, JSON.stringify(profile), { EX: 3600 });
        } catch (error) {
            console.error('Redis cache write failed:', error);
        }
    }

    invalidateProfileCaches = async (userId = null) => {
        try {
            const keys = ['profiles'];
            if (userId !== null) {
                keys.push(`profile:${userId}`);
            }
            await redisClient.del(keys);
        } catch (error) {
            console.error('Redis cache invalidation failed:', error);
        }
    }

    createProfile = async (req, res) => {
        try {
            const { user_id, username, full_name, bio, date_of_birth } = req.body;

            if (!user_id || !username || !full_name || !date_of_birth) {
                return res.status(400).json({ message: 'Please provide all required fields' });
            }

            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
                return res.status(400).json({
                    message: 'Invalid date format. Use YYYY-MM-DD'
                });
            }

            const dob = new Date(`${date_of_birth}T00:00:00.000Z`);

            if (Number.isNaN(dob.getTime()) ||
                dob.toISOString().slice(0, 10) !== date_of_birth) {
                return res.status(400).json({
                    message: 'Invalid date of birth'
                });
            }

            const profile = await ProfileService.create({ user_id, username, full_name, bio, date_of_birth: new Date(date_of_birth) });
            await this.invalidateProfileCaches();
            await this.cacheProfile(profile);

            return res.status(201).json({ message: 'Profile created successfully', profile });
        } catch (error) {
            console.error('Error creating profile:', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }

    uploadProfileImage = async (req, res) => {
        try {
            const { user_id, profile_image } = req.body;
            if (!user_id || !profile_image) {
                return res.status(400).json({ message: 'Please provide user_id and profile_image' });
            }
            this.invalidateProfileCaches(user_id);
            const profile = await ProfileService.upload_profile_image(user_id, profile_image);
            await this.cacheProfile(profile);
            return res.status(200).json({ message: 'Profile image uploaded successfully', profile });
        } catch (error) {
            console.error('Error uploading profile image:', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message     });
        }
    }

    uploadCoverImage = async (req, res) => {
        try {
            const { user_id, cover_image } = req.body;
            if (!user_id || !cover_image) {
                return res.status(400).json({ message: 'Please provide user_id and cover_image' });
            }

            this.invalidateProfileCaches(user_id);
            const profile = await ProfileService.upload_cover_image(user_id, cover_image);
            await this.cacheProfile(profile);
            return res.status(200).json({ message: 'Cover image uploaded successfully', profile });
        } catch (error) {
            console.error('Error uploading cover image:', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }

    getProfile = async (req, res) => {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(400).json({ message: 'Please provide user_id' });
            }

            const cachedProfile = await redisClient.get(`profile:${userId}`);
            if (cachedProfile) {
                return res.status(200).json({ message: 'Profile fetched from cache', profile: JSON.parse(cachedProfile) });
            }

            const profile = await ProfileService.get(userId);
            if (!profile) {
                return res.status(404).json({ message: 'Profile not found' });
            }

            return res.status(200).json({ message: 'Profile fetched successfully', profile });
        } catch (error) {
            console.error('Error fetching profile:', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }

    updateProfile = async (req, res) => {
        try {
            const { user_id } = req.params;
            const { username, full_name, bio, date_of_birth } = req.body;

            if (!user_id && !full_name && !username && !date_of_birth) {
                return res.status(400).json({ message: 'Please provide user_id, full_name, bio, and date_of_birth' });
            }

            // Validate date format (YYYY-MM-DD)
            if(date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
                return res.status(400).json({
                    message: 'Invalid date format. Use YYYY-MM-DD'
                });
            }

            // Validate username
            if(username && username.length < 3) {
                return res.status(400).json({
                    message: 'Username must be at least 3 characters long'
                });
            }

            this.invalidateProfileCaches(user_id);
            const profile = await ProfileService.update(user_id, { username, full_name, bio, date_of_birth });
            await this.cacheProfile(profile);
            return res.status(200).json({ message: 'Profile updated successfully', profile });
        } catch (error) {
            console.error('Error updating profile:', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }

    // deleteProfile = async (req, res) => {
    //     try {
    //         const { user_id } = req.params;
    //         if (!user_id) {
    //             return res.status(400).json({ message: 'Please provide user_id' });
    //         }

    //         this.invalidateProfileCaches(user_id);
    //         const profile = await ProfileService.delete(user_id);
    //         return res.status(200).json({ message: 'Profile deleted successfully', profile });
    //     } catch (error) {
    //         console.error('Error deleting profile:', error);
    //         return res.status(500).json({ message: 'Internal Server Error' });
    //     }
    // }
}

export default new ProfileController();