// src/lib/evm.js
import { Alchemy, Network } from 'alchemy-sdk'
import { ethers } from 'ethers'

// Alchemy API key from .env
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY

if (!ALCHEMY_KEY) {
  console.warn('Missing VITE_ALCHEMY_API_KEY in environment.')
}

// Alchemy-supported EVM chains
const alchemyConfigs = {
  ethereum: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ETH_MAINNET }),
  polygon: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.MATIC_MAINNET }),
  arbitrum: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ARB_MAINNET }),
  optimism: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.OPT_MAINNET }),
  base: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.BASE_MAINNET }),
  zksync: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ZKSYNC_MAINNET }),
  scroll: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.SCROLL_MAINNET }),
  starknet: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.STARKNET_MAINNET }),
}

// Non-Alchemy EVM chains (RPC fallback only)
const rpcConfigs = {
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  fantom: 'https://rpcapi.fantom.network',
}

/**
 * Fetch native + ERC20 balances across all major EVM chains.
 * Logs results and returns an array of balances.
 */
export async function getEvmBalances(address) {
  if (!address) throw new Error('Address required')

  const results = []

  // ---------- Alchemy Networks ----------
  const alchemyResults = await Promise.all(
    Object.entries(alchemyConfigs).map(async ([chain, alchemy]) => {
      const list = []
      try {
        // Native balance
        const native = await alchemy.core.getBalance(address, 'latest')
        list.push({
          chain,
          token: 'NATIVE',
          balance: ethers.formatEther(native),
        })

        // ERC20 tokens
        const data = await alchemy.core.getTokenBalances(address)
        for (const t of data.tokenBalances) {
          if (t.tokenBalance === '0') continue
          try {
            const meta = await alchemy.core.getTokenMetadata(t.contractAddress)
            const formatted = ethers.formatUnits(
              t.tokenBalance,
              meta.decimals || 18
            )
            list.push({
              chain,
              token: meta.symbol || 'UNKNOWN',
              name: meta.name || 'Unknown Token',
              balance: formatted,
              address: t.contractAddress,
            })
          } catch (err) {
            console.warn(`${chain}: Token metadata failed`, err.message)
          }
        }
      } catch (err) {
        console.warn(`${chain}: Alchemy query failed`, err.message)
      }
      return list
    })
  )

  results.push(...alchemyResults.flat())

  // ---------- RPC Fallback Networks ----------
  for (const [chain, rpc] of Object.entries(rpcConfigs)) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc)
      const bal = await provider.getBalance(address)
      results.push({
        chain,
        token: 'NATIVE',
        balance: ethers.formatEther(bal),
      })
    } catch (err) {
      console.warn(`${chain}: RPC failed`, err.message)
    }
  }

  return results
}
