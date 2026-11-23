import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

const GraphState = Annotation.Root({
    message: Annotation(),
    result: Annotation(),
    approved: Annotation()
});

const understandRequest = async (state) => {
    console.log("Understanding:", state.message);
    return { result: "Email sending request detected" };
};

const checkApproval = async (state) => {
    console.log("Checking approval...");
    return { approved: state.approved };
};

const sendEmail = async (state) => {
    console.log("Sending email...");
    return { result: "Email sent successfully!" };
};

const rejectEmail = async (state) => {
    console.log("Email rejected.");
    return { result: "Email sending cancelled." };
};

const workflow = new StateGraph(GraphState)
    .addNode("understand", understandRequest)
    .addNode("check", checkApproval)
    .addNode("send", sendEmail)
    .addNode("reject", rejectEmail)
    .addEdge(START, "understand")
    .addEdge("understand", "check")
    .addConditionalEdges("check", (state) => {
        return state.approved ? "send" : "reject";
    })
    .addEdge("send", END)
    .addEdge("reject", END);

const app = workflow.compile();

const response = await app.invoke({
    message: "Send an email to John",
    approved: false
});

console.log("Final State:", response);