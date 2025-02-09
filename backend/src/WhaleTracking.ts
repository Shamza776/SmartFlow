import { ActionProvider, Action, WalletProvider, Network } from "@coinbase/agentkit";
import { Network as AlchemyNetwork, Alchemy } from "alchemy-sdk";
import { ethers } from "ethers";
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

export class WhaleTrackerProvider implements ActionProvider<WalletProvider> {
  name = "WhaleTracker";
  actionProviders = [];
  
  // Fix: supportsNetwork should be a function
  supportsNetwork = (network: Network): boolean => {
    return true; // Or implement your network support logic
  };

  private alchemy: Alchemy;
  private graphClient: GraphQLClient;
  private whaleData: any[] = [];
  
  private WHALE_THRESHOLD = {
    ETH: ethers.parseEther("10"),
    USDT: ethers.parseUnits("20000", 6),
    USDC: ethers.parseUnits("20000", 6)
  };

  private TOKENS = {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  };

  constructor() {
    const settings = {
      apiKey: process.env.ALCHEMY_API_KEY,
      network: AlchemyNetwork.ETH_MAINNET,
    };
    this.alchemy = new Alchemy(settings);
    this.graphClient = new GraphQLClient('https://api.studio.thegraph.com/query/smartflowsubgraph/v0.0.4');
    this.startWhaleMonitoring();
  }

  // Fix: getActions should return an array of Action objects
  getActions(walletProvider: WalletProvider): any {
    return [
      {
        name: 'get_recent_whale_moves',
        description: 'Get the most recent whale transactions',
        schema: {
          input: z.object({}),
          output: z.array(z.object({
            timestamp: z.number(),
            token: z.string(),
            amount: z.string(),
            from: z.string(),
            to: z.string(),
            txHash: z.string()
          }))
        },
        execute: async () => {
          return this.whaleData.slice(-10).reverse();
        }
      },
      {
        name: 'get_whale_analysis',
        description: 'Analyze whale movements in the last 24 hours',
        schema: {
          input: z.object({}),
          output: z.object({
            totalMoves: z.number(),
            byToken: z.object({
              WETH: z.number(),
              USDT: z.number(),
              USDC: z.number()
            })
          })
        },
        execute: async () => {
          const last24Hours = this.whaleData.filter(
            move => Date.now() - move.timestamp < 24 * 60 * 60 * 1000
          );
          return {
            totalMoves: last24Hours.length,
            byToken: {
              WETH: last24Hours.filter(move => move.token === "WETH").length,
              USDT: last24Hours.filter(move => move.token === "USDT").length,
              USDC: last24Hours.filter(move => move.token === "USDC").length
            }
          };
        }
      },
      {
        name: 'query_subgraph',
        description: 'Query the whale tracking subgraph',
        schema: {
          input: z.object({
            query: z.string()
          }),
          output: z.any()
        },
        execute: async (params: { query: string }) => {
          try {
            return await this.graphClient.request(params.query);
          } catch (error) {
            throw new Error(`Subgraph query failed: ${error}`);
          }
        }
      }
    ];
  }

  private async startWhaleMonitoring() {
    const transferSubscription = {
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      ],
      fromBlock: "latest"
    };

    this.alchemy.ws.on(transferSubscription, (log) => {
      try {
        const amountHex = log.data;
        if (!amountHex || amountHex === "0x") {
          console.error("Invalid amount data:", log);
            return; // Skip processing this log
        }

const amount = BigInt(amountHex);

        const from = `0x${log.topics[1].slice(26)}`;
        const to = `0x${log.topics[2].slice(26)}`;
        
        let transferInfo = {
          timestamp: Date.now(),
          token: "",
          amount: "",
          from,
          to,
          txHash: log.transactionHash
        };


        if (log.address.toLowerCase() === this.TOKENS.WETH.toLowerCase() && amount >= this.WHALE_THRESHOLD.ETH) {
          transferInfo.token = "WETH";
          transferInfo.amount = ethers.formatUnits(amount, 18);
          this.whaleData.push(transferInfo);
          console.log(`🐋 Large WETH Transfer: ${transferInfo.amount} WETH`);
        }
        else if (log.address.toLowerCase() === this.TOKENS.USDT.toLowerCase() && amount >= this.WHALE_THRESHOLD.USDT) {
          transferInfo.token = "USDT";
          transferInfo.amount = ethers.formatUnits(amount, 6);
          this.whaleData.push(transferInfo);
          console.log(`🐋 Large USDT Transfer: ${transferInfo.amount} USDT`);
        }
        else if (log.address.toLowerCase() === this.TOKENS.USDC.toLowerCase() && amount >= this.WHALE_THRESHOLD.USDC) {
          transferInfo.token = "USDC";
          transferInfo.amount = ethers.formatUnits(amount, 6);
          this.whaleData.push(transferInfo);
          console.log(`🐋 Large USDC Transfer: ${transferInfo.amount} USDC`);
        }
      } catch (error) {
        console.error("Error processing transfer:", error);
      }
    });
  }
}