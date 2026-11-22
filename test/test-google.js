import 'dotenv/config';
import { google } from 'googleapis';

const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth });
const youtube = google.youtube({ version: 'v3', auth });

const profile = await gmail.users.getProfile({ userId: 'me' });
console.log('Gmail connected:', profile.data.emailAddress);

const channel = await youtube.channels.list({
    part: ['snippet'],
    mine: true
});
console.log('YouTube connected:', channel.data.items?.[0]?.snippet?.title);