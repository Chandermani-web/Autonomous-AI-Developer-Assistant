import { getRepositories } from "../src/tools/github/github.tools.js";;

const result = await getRepositories.invoke({
    username: "chandermani-web"
});

console.log(result);