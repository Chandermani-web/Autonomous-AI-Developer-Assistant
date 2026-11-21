import { createClient } from 'redis';

const redisClient = createClient({
    username: 'default',
    password: 'ETSxvDtHSU7DxYJBL2cfapuDj6A3hmFW',
    socket: {
        host: 'redis-16658.crce283.ap-south-1-2.ec2.cloud.redislabs.com',
        port: 16658
    }
});

redisClient.on('error', err => console.log('Redis Client Error', err));
export default redisClient;