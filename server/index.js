const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server"); 

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simple chat
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const chatSession = model.startChat({
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
      history: [],
    });

    const result = await chatSession.sendMessage(message);

    // Ensure only one response is sent
    return res.json({ response: result.response.text() });
  } catch (error) {
    console.error("Error generating response from Gemini API:", error);
    if (error.message.includes("SAFETY")) {
      return res.status(400).json({ error: "Request blocked due to safety concerns." });
    }
    return res.status(500).json({ error: "Error generating response from Gemini API" });
  }
});

// Chat with stream
app.post('/chat/stream', async (req, res) => {
  const { message } = req.body;

  try {
    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessageStream(message);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${chunkText}\n\n`);
    }

    // Only call res.end() after all chunks have been sent
    return res.end(); 
  } catch (error) {
    console.error("Error streaming response from Gemini API:", error.message);
    if (error.message.includes("SAFETY")) {
      return res.status(400).json({ error: "Streaming request blocked due to safety concerns." });
    }
    return res.status(500).json({ error: 'Error streaming response from Gemini API' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
