
const formatResponse = (content) => {
    if (!content) return "I couldn't generate a response.";

    return String(content)
        .replace(/\\([*_`~#[\]()#+.!|>])/g, "$1")
        .replace(/\\n/g, "\n")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/&#x20;/gi, " ")
        .trim();
};

export default formatResponse;
