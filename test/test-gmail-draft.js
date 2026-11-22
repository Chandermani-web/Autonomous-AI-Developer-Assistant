import gmail from "../src/tools/gmail/gmail.config.js";

try {
    const { data } = await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
            message: {
                raw: Buffer.from(
                    "To: test@example.com\r\nSubject: OAuth Test\r\n\r\nTesting Gmail draft."
                ).toString("base64url")
            }
        }
    });
    console.log("Gmail draft created:", data.id);
} catch (error) {
    console.error("Gmail draft failed:", error.response?.data || error.message);
}