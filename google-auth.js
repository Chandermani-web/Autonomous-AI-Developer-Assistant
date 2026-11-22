
import 'dotenv/config';
import { google } from 'googleapis';
import readline from 'node:readline';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload'
];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
});

console.log('\nOpen this URL in your browser:\n');
console.log(authUrl);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\nPaste the authorization code here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code.trim());

        console.log('\nAccess Token:', tokens.access_token);
        console.log('\nRefresh Token:', tokens.refresh_token ?? 'No refresh token returned. Revoke prior access and authorize again.');

        console.log('\nKeep your tokens private.');
    } catch (error) {
        console.error('\nAuthentication failed:', error.response?.data || error.message);
    } finally {
        rl.close();
    }
});
