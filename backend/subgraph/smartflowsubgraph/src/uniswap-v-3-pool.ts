import {
  Swap as SwapEvent,
} from "../generated/UniswapV3Pool/UniswapV3Pool"
import {
  Swap,
} from "../generated/schema"


export function handleSwap(event: SwapEvent): void {
  let entity = new Swap(
    event.transaction.hash.toHex().concat("-").concat(event.logIndex.toString())
  )
  entity.sender = event.params.sender
  entity.recipient = event.params.recipient
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1
  entity.sqrtPriceX96 = event.params.sqrtPriceX96
  entity.liquidity = event.params.liquidity
  entity.tick = event.params.tick

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
