require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is missing from .env file!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const sessions = {};

// Use the 1.5-flash or your preferred model
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    systemInstruction: "You are a space-themed assistant named SATELLITE. Be concise. Use bullet points for long answers."
});

app.post('/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ error: "Missing message or sessionId" });
        }

        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }

        // 1. Start Chat with History
        const chat = model.startChat({
            history: sessions[sessionId],
            generationConfig: { maxOutputTokens: 1000 },
        });

        // 2. Get AI Response
        const result = await chat.sendMessage(message);
        const text = result.response.text();

        // 3. Update Local Memory
        sessions[sessionId].push({ role: "user", parts: [{ text: message }] });
        sessions[sessionId].push({ role: "model", parts: [{ text: text }] });

        /**
         * --- HACKATHON UNIQUE FEATURE: AUTO-SUMMARIZATION ---
         * We ask the AI to summarize the mission in 3 words for the sidebar title.
         * We only do this every few messages to save on quota.
         */
        let missionTopic = "Active Mission";
        if (sessions[sessionId].length >= 2) {
            const summaryResult = await model.generateContent(
                `Summarize this conversation in exactly 3 words for a mission title. Conversation: ${message}`
            );
            missionTopic = summaryResult.response.text().replace(/[".]/g, "").trim();
        }

        // 4. Return the response + the new metadata
        res.json({ 
            reply: text, 
            topic: missionTopic, // For the sidebar title
            lastTopic: message.substring(0, 30) + "..." // For the "Welcome Back" greeting
        });

    } catch (error) {
        console.error("--- SERVER ERROR ---", error.message);
        res.status(500).json({ error: "Transmission failed." });
    }
});

app.delete('/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    delete sessions[sessionId];
    res.json({ message: `History for ${sessionId} cleared.` });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Satellite Server online at http://localhost:${PORT}`);
});