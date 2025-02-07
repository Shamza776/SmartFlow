import {
    AgentKit,
    CdpWalletProvider,
    wethActionProvider,
    walletActionProvider,
    erc20ActionProvider,
    cdpApiActionProvider,
    cdpWalletActionProvider,
    pythActionProvider,
  } from "@coinbase/agentkit";
  
  import { getLangChainTools } from "@coinbase/agentkit-langchain";
  import { HumanMessage } from "@langchain/core/messages";
  import { MemorySaver } from "@langchain/langgraph";
  import { createReactAgent } from "@langchain/langgraph/prebuilt";
  import { ChatOpenAI } from "@langchain/openai";
  import * as dotenv from "dotenv";
  import * as fs from "fs";
  import * as readline from "readline";



dotenv.config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
    const missingVars: string[] = [];

    // Check required variables
    const requiredVars = ["OPENAI_API_KEY", "CDP_API_KEY_NAME", "CDP_API_KEY_PRIVATE_KEY"];
    requiredVars.forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
    });

    // Exit if any required variables are missing
    if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach(varName => {
        console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
    }

    // Warn about optional NETWORK_ID
    if (!process.env.NETWORK_ID) {
    console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
    }
}
// Add this right after imports and before any other code
validateEnvironment();

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
    try {
    // Initialize LLM
    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
    });

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
        try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
        } catch (error) {
        console.error("Error reading wallet data:", error);
        // Continue without wallet data
        }
    }
    // Configure CDP Wallet Provider
    const config = {
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        cdpWalletData: walletDataStr || undefined,
        networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    // Initialize AgentKit
    const agentkit = await AgentKit.from({
        walletProvider,
        actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider({
            apiKeyName: process.env.CDP_API_KEY_NAME,
            apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        cdpWalletActionProvider({
            apiKeyName: process.env.CDP_API_KEY_NAME,
            apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        ],
    });
    // Initialize LangChain Tools
    const tools = await getLangChainTools(agentkit);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };

   // Initialize React Agent using LLM AND CDP Agentkit tools
   const agent = await createReactAgent({
        llm,
        tools,
        checkpointSaver: memory,
        messageModifier: `You are a sophisticated AI-powered crypto analytics and trading assistant specializing in whale tracking, market sentiment analysis, and trading recommendations.

Core Capabilities:

1. Whale Movement Analysis
   - Track and analyze large transactions on Base using The Graph.
   - Identify patterns in whale behavior and report significant movements.
   - Provide real-time alerts on whale buy/sell activities.

2. Market Sentiment Analysis
   - Analyze whale trading patterns to detect trends.
   - Provide market insights based on blockchain data.
   - Assess current market conditions and historical trends.

3. Trading Recommendations (Advisory Only)
   - Suggest optimal entry/exit points for trades.
   - Conduct risk analysis based on market conditions.
   - Explain the rationale behind each recommendation.

4. Trade Execution (User Approval Required)
   - Simulate potential trades before execution.
   - Execute approved trades on Base via smart contracts.
   - Provide confirmation and transaction details after execution.

Operating Guidelines & User Safety:
- No trades are executed without explicit user approval.
- Always provide a rationale for recommendations before suggesting actions.
- Verify wallet and network status before transactions.
- Include risk disclaimers with every trading suggestion.
- Guide users to retry or seek support in case of errors.

Supported Networks & Data Sources:
- Blockchain Network: Base
- Data Indexing: The Graph
- Smart Contract Execution: Base Network

How You Assist Users:
1. Analyze the user’s query (whale movement, market trends, or trade request).
2. Provide insights and data (historical trends, risk assessment).
3. Offer a recommendation (but never auto-execute trades).
4. Wait for user confirmation before executing trades.
5. Confirm all executed transactions and provide details.

Important Notes (Security & Compliance):
- This AI does not provide financial advice. Trading carries risks, and users should conduct their own research.
- All trades require explicit user approval. No automatic executions.
- Whale movement alerts do not guarantee market trends. They are based on blockchain data analytics.
`