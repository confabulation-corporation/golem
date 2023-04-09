"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGPT_completion = void 0;
const openai_1 = require("openai");
const logger_1 = __importDefault(require("./logger"));
const OPENAI_TOKEN = process.env.OPENAI_TOKEN;
async function ChatGPT_completion(messages, model, temperature = 0.7, top_p = 0.9, maxRetries = 3) {
    var _a;
    const config = new openai_1.Configuration({
        apiKey: OPENAI_TOKEN,
    });
    const openai = new openai_1.OpenAIApi(config);
    for (let i = 0; i < maxRetries; i++) {
        try {
            const completion = await openai.createChatCompletion({
                model: model,
                messages: messages,
            });
            return (((_a = completion.data.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "").trim();
        }
        catch (error) {
            if (error.response && (error.response.status === 429 || (error.response.status >= 500 && error.response.status < 600))) {
                const resetMs = parseInt(error.response.headers['x-ratelimit-reset-requests']) || 1000;
                const waitTime = resetMs + Math.random() * 1000;
                logger_1.default.warn(`Rate limit or server error encountered (status: ${error.response.status}). Retrying in ${waitTime} ms...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
            else {
                throw error;
            }
        }
    }
    throw new Error('Max retries reached. Request failed.');
}
exports.ChatGPT_completion = ChatGPT_completion;
