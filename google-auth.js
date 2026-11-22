import 'dotenv/config';
import { google } from 'googleapis';
import readline from 'node:readline';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload'
  ]
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

    console.log('\nYour refresh token:\n');
    console.log(tokens.refresh_token ?? 'No refresh token returned. Revoke prior access and authorize again.');

    console.log('\nKeep this token private.');
  } catch (error) {
    console.error('Authentication failed:', error.message);
  } finally {
    rl.close();
  }
});