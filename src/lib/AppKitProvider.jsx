import React from 'react'
import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'
import {
  mantle, mainnet, polygon, arbitrum, base, optimism, bsc, avalanche,
  solana, solanaTestnet, bitcoin, bitcoinTestnet
} from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'

// 1️⃣ WalletConnect / Reown Cloud Project ID
// ⚠️ Make sure this projectId exists and has "https://ice-man.netlify.app" in Allowed Origins
const projectId = 'd3b40e77692848407eb683bab403e3b9'

// 2️⃣ Supported networks
const evmNetworks = [mantle, mainnet, polygon, arbitrum, base, optimism, bsc, avalanche]
const solNetworks = [solana, solanaTestnet]
const btcNetworks = [bitcoin, bitcoinTestnet]

// 3️⃣ Adapters for each chain type
const wagmiAdapter = new WagmiAdapter({ projectId, networks: evmNetworks })
const solanaAdapter = new SolanaAdapter({})
const bitcoinAdapter = new BitcoinAdapter({})

// Export wagmiConfig for useAccount(), etc.
export const wagmiConfig = wagmiAdapter.wagmiConfig

// 4️⃣ Metadata — must match your exact deployed Netlify domain
const metadata = {
  name: 'NeonVault',
  description: 'Creative wallet-gated site',
  url: 'https://ice-man.netlify.app', // ✅ EXACT match for your live site
  icons: ['https://ice-man.netlify.app/favicon.svg'] // ✅ must also point to same domain
}

// 5️⃣ Create the AppKit modal configuration
export const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter, bitcoinAdapter],
  networks: [...evmNetworks, ...solNetworks, ...btcNetworks],
  projectId,
  metadata,
  features: { analytics: true },
  defaultAccountTypes: {
    eip155: 'eoa',    // EVM wallets
    solana: 'wallet', // Solana wallets
    bip122: 'payment' // Bitcoin wallets
  },
  walletConnect: {
    relayUrl: 'wss://relay.walletconnect.com', // ✅ correct relay endpoint
    projectId,
    metadata
  }
})

// 6️⃣ Helper functions to open modals
export function openConnectModal() {
  appKit.open()
}

export function openNetworkModal() {
  appKit.open({ view: 'Networks' })
}

// 7️⃣ Wrap app with WagmiProvider
export function AppKitProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      {children}
    </WagmiProvider>
  )
}
