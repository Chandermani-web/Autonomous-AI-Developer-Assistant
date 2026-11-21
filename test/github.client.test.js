import githubClient from "../src/tools/github/github.client.js";

const user = await githubClient.getAuthenticatedUser();

console.log("GitHub connected:", user.login);
