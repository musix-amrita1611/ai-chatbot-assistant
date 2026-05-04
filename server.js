require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// Verify API Key exists on startup
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is missing from .env file!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * --- SESSION STORAGE ---
 * This object will store the chat history for each unique Mission ID.
 * Format: { "Mission_123": [{ role: "user", parts: [...] }, { role: "model", parts: [...] }] }
 */
const sessions = {};

// Initialize Model Configuration
const model = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-lite-preview", // Stable version, change to your preview model if preferred
    systemInstruction: "You are a helpful assistant. Use bullet points. START EVERY POINT ON A NEW LINE. Use TWO line breaks between every point."
});

app.post('/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ error: "Missing message or sessionId" });
        }

        // 1. If this is a new Mission ID, initialize an empty history array
        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }

        // 2. Start a chat session using the history for this specific Mission
        const chat = model.startChat({
            history: sessions[sessionId],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // 3. Send the message through the chat session
        const result = await chat.sendMessage(message);
        const text = result.response.text();

        // 4. Record the interaction in our local session storage to maintain "memory"
        sessions[sessionId].push({
            role: "user",
            parts: [{ text: message }],
        });
        sessions[sessionId].push({
            role: "model",
            parts: [{ text: text }],
        });

        res.json({ reply: text });

    } catch (error) {
        console.error("--- DETAILED SERVER ERROR ---");
        console.error(error.message);
        
        // Handle Rate Limiting (Quota)
        if (error.status === 429 || error.message?.includes('429')) {
            return res.status(429).json({ error: "Quota exhausted. Please wait 60 seconds." });
        }

        res.status(500).json({ error: "Transmission failed. Check satellite link." });
    }
});

// Optional: Route to clear a mission's memory if needed
app.delete('/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    delete sessions[sessionId];
    res.json({ message: `History for ${sessionId} cleared.` });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`🚀 Ready for space transmissions with memory enabled!`);
});