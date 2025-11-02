// src/lib/ethersSigner.js
import { ethers } from 'ethers'

// This function will safely return a signer from the given provider
export function getEthersSigner(provider) {
  if (!provider) throw new Error('No provider found')
  return provider.getSigner()
}
