require("dotenv").config();
import { Network, Alchemy } from "alchemy-sdk";

const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(settings);

//UNISWAP V3 address on ethereum mainnet
const uniswapV3Addresses = "0x1f98431c8ad98523631ae4a59f267346ea31f984";

//EVENTS
const transfer = {
    topic0Signature: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    topic1ZeroAddress: "0x0000000000000000000000000000000000000000000000000000000000000000",
    //topic2Recipient: "0x000000000000000000000000000000000000"
}
const swap = {
    topic0Signature: "0x128acb1f5ad74a27b8323f3a7d4f3c0cfe2ad80fbeab2b2953cdefe3edb2835d",
    //topic1ZeroAddress: "0x0000000000000000000000000000000000000000000000000000000000000000",
    //topic2Recipient: "0x0000000000000000000000000000000000000000000000000000000000000000",
}

const whaleTransfer = {
    topics: [transfer.topic0Signature, transfer.topic1ZeroAddress],
    address: uniswapV3Addresses,
    fromBlock: "latest"
}
const whaleSwap = {
    topics: [swap.topic0Signature],
    address: uniswapV3Addresses,
    fromBlock: "latest"
}

//web socket connection
alchemy.ws.on(whaleTransfer, (message) => {
    console.log(message);
});
alchemy.ws.on(whaleSwap, (message) => {
    console.log(message);
});

console.log("Connected to websocket");