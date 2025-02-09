// import {
//   PoolCreated as PoolCreatedEvent
// } from "../generated/UniswapV3Factory/UniswapV3Factory"
// import {
//   PoolCreated
// } from "../generated/schema"

// export function handlePoolCreated(event: PoolCreatedEvent): void {
//   let entity = new PoolCreated(
//     event.transaction.hash.toHex().concat("-").concat(event.logIndex.toString())
//    )
//   entity.token0 = event.params.token0
//   entity.token1 = event.params.token1
//   entity.pool = event.params.pool

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }
