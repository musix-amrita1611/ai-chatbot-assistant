require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// Check for API Key
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is missing from .env file!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const sessions = {};

// --- SATELLITE MODEL CONFIGURATION ---
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest", // Most stable for Search tools
    tools: [
        {
            googleSearchRetrieval: {}, // Enables real-time Google Search
        },
    ],
    systemInstruction: {
        role: "system",
        parts: [{ 
            text: `You are a space-themed assistant named SATELLITE. 
                   Today's Earth date is ${new Date().toDateString()}. 
                   The current year is 2026. This is NOT a simulation. 
                   ALWAYS use the Google Search tool to find real-time info (like IPL scores).
                   Never hallucinate scores; if you don't know, search for them.
                   Be concise. Use bullet points for long answers.` 
        }]
    }
});

app.post('/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ error: "Missing message or sessionId" });
        }

        // Initialize session if new
        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }

        // Prepend current date context to every message
        const contextMessage = `[STARDATE: ${new Date().toDateString()}] User Transmission: ${message}`;

        // 1. Start Chat with History
        const chat = model.startChat({
            history: sessions[sessionId],
            generationConfig: { 
                maxOutputTokens: 1000,
                temperature: 0.7 
            },
        });

        // 2. Get AI Response
        const result = await chat.sendMessage(contextMessage);
        const text = result.response.text();

        // 3. Update Local Memory
        sessions[sessionId].push({ role: "user", parts: [{ text: message }] });
        sessions[sessionId].push({ role: "model", parts: [{ text: text }] });

        // --- GRACEFUL SUMMARIZATION ---
        let missionTopic = "Active Mission";
        try {
            if (sessions[sessionId].length >= 2) {
                // Quick summary call for the sidebar
                const summaryResult = await model.generateContent(
                    `Summarize this query in exactly 3 words for a mission title: ${message}`
                );
                missionTopic = summaryResult.response.text().replace(/[".]/g, "").trim();
            }
        } catch (summaryError) {
            console.warn("⚠️ Summary failed, using default title.");
            missionTopic = "Ongoing Comms"; 
        }

        // Send response back to Frontend
        res.json({ 
            reply: text, 
            topic: missionTopic, 
            lastTopic: message.substring(0, 30) + "..." 
        });

    } catch (error) {
        console.error("--- SERVER ERROR ---", error.message);
        
        // Handle specific API errors
        const isQuotaError = error.message.includes("429") || error.message.toLowerCase().includes("quota");
        const isNotFoundError = error.message.includes("404");

        res.status(isQuotaError ? 429 : 500).json({ 
            error: isQuotaError ? "Satellite Quota Exceeded" : "Transmission failed.",
            message: isQuotaError 
                ? "Too many signals! Please wait a minute for the orbit to clear." 
                : isNotFoundError 
                    ? "Model coordinates (404) not found. Checking link..." 
                    : "The space station encountered an internal error."
        });
    }
});

// Clear Session Route
app.delete('/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    delete sessions[sessionId];
    res.json({ message: `History for ${sessionId} cleared.` });
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Satellite Server online at http://localhost:${PORT}`);
    console.log(`📡 Current System Time: ${new Date().toDateString()}`);
});