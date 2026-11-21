
import githubAgent from "../src/agent/github.agent.js";

const response = await githubAgent.invoke({
    messages: [
        {
            role: "user",
            content: "Show open pull requests in chandermani-web/CM.AI"
        }
    ]
});

console.log(response.messages.at(-1).content);
