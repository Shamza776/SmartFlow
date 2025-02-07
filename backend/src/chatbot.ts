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
