import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import axios from "axios";
import dotenv from "dotenv";
import { systemInfo } from "./types/system.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const WS_PORT = 8080;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY!;
const VOICE_ID = process.env.VOICE_ID!;

let conversationHistory: { role: "system" | "user" | "assistant"; content: string }[] = [];

interface ClientMessage {
    prompt: string;
}

interface ServerMessage {
    text?: string;
    done?: boolean;
    error?: string;
}

app.get("/", (req, res) => {
    res.send("AI WebSocket Server is running...");
});

const server = app.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket client connected.");

    ws.on("message", async (message: string) => {
        let parsedMessage: ClientMessage;

        try {
            parsedMessage = JSON.parse(message);
            if (!parsedMessage.prompt) {
                ws.send(JSON.stringify({ error: "Missing prompt" }));
                return;
            }
        } catch {
            ws.send(JSON.stringify({ error: "Invalid message format" }));
            return;
        }

        const { prompt } = parsedMessage;
        conversationHistory.push({ role: "user", content: prompt });

        try {
            const textResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemInfo }, ...conversationHistory],
                stream: true,
                temperature: 0.7,
                max_tokens: 150,
            });

            let fullResponse = "";

            for await (const chunk of textResponse) {
                const textChunk = chunk.choices[0]?.delta?.content;
                if (textChunk) {
                    fullResponse += textChunk;
                    ws.send(JSON.stringify({ text: textChunk }));
                }
            }

            conversationHistory.push({ role: "assistant", content: fullResponse });
            startElevenLabsStream(ws, fullResponse);
        } catch (error) {
            ws.send(JSON.stringify({ error: "Processing error" }));
        }
    });

  
});

function startElevenLabsStream(ws: WebSocket, text: string): void {

    axios
        .post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
            {
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.6, speed: 1.0 },
            },
            {
                headers: { "xi-api-key": ELEVEN_API_KEY, "Content-Type": "application/json" },
                responseType: "stream",
            }
        )
        .then((response) => {
            let totalChunks = 0;
            let hasAudioData = false;

            response.data.on("data", (chunk: Buffer) => {
                if (!hasAudioData) {
                    hasAudioData = true;
                }
                totalChunks++;
                ws.send(chunk);
            });

            response.data.on("end", () => {
                if (!hasAudioData) {
                    console.error("❌ ElevenLabs returned no audio data.");
                    ws.send(JSON.stringify({ error: "No audio data received." }));
                } else {
                    ws.send(JSON.stringify({ done: true }));
                }
            });

            response.data.on("error", (err: any) => {
                console.error("❌ ElevenLabs Stream Error:", err);
                ws.send(JSON.stringify({ error: "Streaming error from ElevenLabs" }));
            });
        })
        .catch((err) => {
            console.error("❌ Error with ElevenLabs:", err);
            ws.send(JSON.stringify({ error: "TTS processing error" }));
        });

    ws.on("close", () => {
        console.log("🔴 WebSocket closed.");
    });
}

console.log(`✅ WebSocket server is running on ws://localhost:${WS_PORT}`);
