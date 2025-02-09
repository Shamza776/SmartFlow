import { Swap } from "../generated/UniswapV3Pool/UniswapV3Pool";
import { Swap as SwapEvent } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleSwap(event: Swap): void {
  let swap = new SwapEvent(event.transaction.hash.toHexString());
  swap.sender = event.params.sender;
  swap.recipient = event.params.recipient;
  swap.amount0 = event.params.amount0;
  swap.amount1 = event.params.amount1;
  swap.sqrtPriceX96 = event.params.sqrtPriceX96;
  swap.liquidity = event.params.liquidity;
  swap.tick = event.params.tick;
  swap.blockNumber = event.block.number;
  swap.blockTimestamp = event.block.timestamp;
  swap.transactionHash = event.transaction.hash;

 let whaleThreshold = BigInt.fromString("10000000000000000000"); 
  swap.isWhale = swap.amount0.gt(whaleThreshold) || swap.amount1.gt(whaleThreshold);

  swap.save();

}