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
  import { WhaleTrackerProvider } from './WhaleTracking';


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
        networkId: process.env.NETWORK_ID || "base-mainnet",
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
        new WhaleTrackerProvider(),
        ],
    });
    // Initialize LangChain Tools
    const tools = await getLangChainTools(agentkit);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "Smart Flow - AI Crypto Analyst and Assistant" } };

   // Initialize React Agent using LLM AND CDP Agentkit tools
   const agent = await createReactAgent({ 
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: `You are a specialized AI-powered crypto analytics assistant focused on whale tracking on the Base network.

Core Capabilities:

1. Whale Movement Analysis
   - Track and analyze large transactions (token transfers & Uniswap V3 swaps) on Base.
   - Identify significant movements and report transactions over a threshold (e.g., > 10,000 USD).
   - Provide real-time alerts on major buy/sell activities.

How You Assist Users:
1. Fetch recent large transactions using 'get_recent_whale_moves'.
2. Display details (amount, sender, receiver, and transaction link).
3. Allow users to search transactions by token or wallet address.
4. No market sentiment analysis or trade recommendations.

Supported Networks & Data Sources:
- Blockchain Network: Base
- Data Indexing: The Graph (for Uniswap swaps) & RPC calls (for transfers)

Operating Guidelines:
- No financial advice. Users must conduct their own research.
- No automatic trades; only data insights are provided.
- If data retrieval fails, suggest checking network status or using alternative sources like Etherscan.
` 
});

   // Save wallet data
   const exportedWallet = await walletProvider.exportWallet();
   fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

   return { agent, config: agentConfig };
   } catch (error) {
   console.error("Failed to initialize agent:", error);
   throw error; // Re-throw to be handled by caller
   }
}

/**
* Run the agent autonomously with specified intervals
*/
async function runAutonomousMode(agent: any, config: any, interval = 10) {
   console.log("Starting autonomous mode...");

   while (true) {
   try {
    const thought =
    "Monitor whale movements and analyze blockchain transactions on Base. " +
    "Detect significant trades, analyze market trends, and generate insights. " +
    "If a trading opportunity is detected, provide recommendations to the user while ensuring transparency and risk awareness.";
  
       const stream = await agent.stream({ messages: [new HumanMessage(thought)] }, config);

       for await (const chunk of stream) {
       if ("agent" in chunk) {
           console.log(chunk.agent.messages[0].content);
       } else if ("tools" in chunk) {
           console.log(chunk.tools.messages[0].content);
       }
       console.log("-------------------");
       }

       await new Promise(resolve => setTimeout(resolve, interval * 1000));
   } catch (error) {
       if (error instanceof Error) {
       console.error("Error:", error.message);
       }
       process.exit(1);
   }
   }
}

/**
* Run the agent interactively based on user input
*/
async function runChatMode(agent: any, config: any) {
   console.log("Starting chat mode... Type 'exit' to end.");

   const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
   });

   const question = (prompt: string): Promise<string> =>
   new Promise(resolve => rl.question(prompt, resolve));

   try {
   while (true) {
       const userInput = await question("\nPrompt: ");

       if (userInput.toLowerCase() === "exit") {
       break;
       }

       const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);

       for await (const chunk of stream) {
       if ("agent" in chunk) {
           console.log(chunk.agent.messages[0].content);
       } else if ("tools" in chunk) {
           console.log(chunk.tools.messages[0].content);
       }
       console.log("-------------------");
       }
   }
   } catch (error) {
   if (error instanceof Error) {
       console.error("Error:", error.message);
   }
   process.exit(1);
   } finally {
   rl.close();
   }
}

/**
* Choose whether to run in autonomous or chat mode
*/
async function chooseMode(): Promise<"chat" | "auto"> {
   const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
   });

   const question = (prompt: string): Promise<string> =>
   new Promise(resolve => rl.question(prompt, resolve));

   while (true) {
   console.log("\nAvailable modes:");
   console.log("1. chat    - Interactive chat mode");
   console.log("2. auto    - Autonomous action mode");

   const choice = (await question("\nChoose a mode (enter number or name): "))
       .toLowerCase()
       .trim();

   if (choice === "1" || choice === "chat") {
       rl.close();
       return "chat";
   } else if (choice === "2" || choice === "auto") {
       rl.close();
       return "auto";
   }
   console.log("Invalid choice. Please try again.");
   }
}

/**
* Main entry point
*/
async function main() {
   try {
   const { agent, config } = await initializeAgent();
   const mode = await chooseMode();

   if (mode === "chat") {
       await runChatMode(agent, config);
   } else {
       await runAutonomousMode(agent, config);
   }
   } catch (error) {
   if (error instanceof Error) {
       console.error("Error:", error.message);
   }
   process.exit(1);
   }
}

// Start the agent when running directly
if (require.main === module) {
   console.log("Starting Agent...");
   main().catch(error => {
   console.error("Fatal error:", error);
   process.exit(1);
   });
}
 
 export { initializeAgent };