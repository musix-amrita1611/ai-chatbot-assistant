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

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Using 'gemini-1.5-flash' - this is the most widely supported current model
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        const prompt = `System Instruction: You are a helpful assistant. Use bullet points. START EVERY POINT ON A NEW LINE. Use TWO line breaks between every point. \n\n User Message: ${message}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("--- DETAILED SERVER ERROR ---");
        console.error(error.message);
        
        // Specific 429 handling for your "Satellite Interference" message
        if (error.status === 429 || error.message?.includes('429')) {
            return res.status(429).json({ error: "Quota exhausted. Please wait 60 seconds." });
        }

        res.status(500).json({ error: "Transmission failed. Check satellite link." });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`🚀 Ready for space transmissions!`);
});