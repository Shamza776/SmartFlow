// server.ts
import type { Request, Response } from 'express';
import type { RequestHandler } from "express";
import express from "express";
import cors from "cors";
import { HumanMessage } from "@langchain/core/messages";
import { initializeAgent } from "./chatbot";  
const app = express();
app.use(cors());
app.use(express.json());


interface AgentConfig {
  configurable: {
    thread_id: string;
  };
}

let agentInstance: any = null;
let config: AgentConfig | null = null;

async function setupAgent() {
  try {
    const result = await initializeAgent();
    agentInstance = result.agent;
    config = result.config;
    console.log("Agent initialized successfully");
  } catch (error) {
    console.error("Failed to initialize agent:", error);
  }
}

setupAgent().catch(console.error);

const chatHandler: RequestHandler = async (req, res, next) => {
  if (!agentInstance) {
    res.status(500).json({ error: "Chatbot is not initialized yet." });
    return;
  }

  const userMessage = req.body.message;
  if (!userMessage) {
    res.status(400).json({ error: "Message is required." });
    return;
  }

  try {
    const stream = await agentInstance.stream(
      { messages: [new HumanMessage(userMessage)] },
      config
    );
    let response = "";

    for await (const chunk of stream) {
      if ("agent" in chunk) {
        response += chunk.agent.messages[0].content + "\n";
      } else if ("tools" in chunk) {
        response += chunk.tools.messages[0].content + "\n";
      }
    }

    res.json({ response: response.trim() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
};
app.post("/chat", chatHandler);

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});