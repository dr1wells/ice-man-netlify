// src/lib/erc20.js
import { getEthersSigner } from './ethersSigner' // or wherever you defined getEthersSigner

const ERC20_MIN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

// Dynamic import for ethers v5
async function getEthersV5() {
  const { ethers } = await import('ethers')
  return ethers
}

export async function readErc20Balance(tokenAddress, holder) {
  const ethers = await getEthersV5()

  if (!tokenAddress) {
    throw new Error('No token configured for this chain.')
  }

  // ✅ Fix invalid checksum address error
  let token, account
  try {
    token = ethers.utils.getAddress(String(tokenAddress))
    account = ethers.utils.getAddress(String(holder))
  } catch {
    throw new Error('Invalid token or wallet address for this chain.')
  }

  const signer = await getEthersSigner()
  const contract = new ethers.Contract(token, ERC20_MIN_ABI, signer)

  const [decimals, symbol, raw] = await Promise.all([
    contract.decimals(),
    contract.symbol(),
    contract.balanceOf(account)
  ])

  const formatted = ethers.utils.formatUnits(raw, decimals)
  return { symbol, decimals, raw, formatted }
}
