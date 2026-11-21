import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();

class GithubClient {
    constructor() {
        if(!process.env.GITHUB_TOKEN) {
            throw new Error("GITHUB_TOKEN is not defined in environment variables.");
        }

        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });
    }

    getAuthenticatedUser = async () => {
        try {
            const response = await this.octokit.users.getAuthenticated();
            return response.data;
        } catch (error) {
            console.error("Error fetching authenticated user:", error);
            throw error;
        }
    }
}

const githubClient = new GithubClient();
export default githubClient;