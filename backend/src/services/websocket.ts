require("dotenv").config();
import { Network, Alchemy } from "alchemy-sdk";
import { ethers } from "ethers";

const settings = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(settings);

// Threshold values (in native token units)
const WHALE_THRESHOLD = {
    ETH: ethers.parseEther("10"),     // Only show transfers above 10 ETH
    USDT: ethers.parseUnits("20000", 6), // Only show transfers above 20,000 USDT
    USDC: ethers.parseUnits("20000", 6)  // Only show transfers above 20,000 USDC
};

// Common token addresses
const TOKENS = {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
};

// Events
const EVENTS = {
    transfer: {
        signature: "Transfer(address,address,uint256)",
        topic: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    }
};

const transferSubscription = {
    topics: [EVENTS.transfer.topic],
    fromBlock: "latest"
};

function formatAddress(address: string): string {
    // Remove the padding from topic addresses
    return "0x" + address.slice(26);
}

function formatAmount(amount: string, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
}

alchemy.ws.on(transferSubscription, (log) => {
    try {
        const amount = BigInt(log.data);
        const from = formatAddress(log.topics[1]);
        const to = formatAddress(log.topics[2]);
        
        // Filter based on token address and amount
        if (log.address.toLowerCase() === TOKENS.WETH.toLowerCase()) {
            if (amount >= WHALE_THRESHOLD.ETH) {
                console.log(`
🐋 Large WETH Transfer Detected:
Amount: ${formatAmount(log.data, 18)} WETH (${ethers.formatEther(WHALE_THRESHOLD.ETH)} WETH threshold)
From: ${from}
To: ${to}
TX: https://etherscan.io/tx/${log.transactionHash}
                `);
            }
        }
        else if (log.address.toLowerCase() === TOKENS.USDT.toLowerCase()) {
            if (amount >= WHALE_THRESHOLD.USDT) {
                console.log(`
🐋 Large USDT Transfer Detected:
Amount: ${formatAmount(log.data, 6)} USDT (${ethers.formatUnits(WHALE_THRESHOLD.USDT, 6)} USDT threshold)
From: ${from}
To: ${to}
TX: https://etherscan.io/tx/${log.transactionHash}
                `);
            }
        }
        else if (log.address.toLowerCase() === TOKENS.USDC.toLowerCase()) {
            if (amount >= WHALE_THRESHOLD.USDC) {
                console.log(`
🐋 Large USDC Transfer Detected:
Amount: ${formatAmount(log.data, 6)} USDC (${ethers.formatUnits(WHALE_THRESHOLD.USDC, 6)} USDC threshold)
From: ${from}
To: ${to}
TX: https://etherscan.io/tx/${log.transactionHash}
                `);
            }
        }
    } catch (error) {
        console.error("Error processing transfer:", error);
    }
});

// Monitor connection status
alchemy.ws.on("connect", () => {
    console.log(`
🟢 WebSocket Connected
Monitoring large transfers:
- WETH above ${ethers.formatEther(WHALE_THRESHOLD.ETH)} ETH
- USDT above ${ethers.formatUnits(WHALE_THRESHOLD.USDT, 6)} USDT
- USDC above ${ethers.formatUnits(WHALE_THRESHOLD.USDC, 6)} USDC
    `);
});

alchemy.ws.on("disconnect", () => {
    console.log("🔴 WebSocket Disconnected");
});

alchemy.ws.on("error", (error) => {
    console.error("⚠️ WebSocket Error:", error);
});

console.log("Starting whale transfer monitor...");

// Keep script running and handle clean shutdown
process.on("SIGINT", () => {
    console.log("Closing WebSocket connection...");
    process.exit();
});