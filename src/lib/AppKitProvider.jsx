// src/lib/AppKitProvider.jsx
import React, { useEffect } from 'react'
import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'
import {
  mantle, mainnet, polygon, arbitrum, base, optimism, bsc, avalanche,
  solana, solanaTestnet, bitcoin, bitcoinTestnet
} from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'

// 🧩 WalletConnect Project ID
const projectId = 'd3b40e77692848407eb683bab403e3b9'

// 🌐 Networks
const evmNetworks = [mantle, mainnet, polygon, arbitrum, base, optimism, bsc, avalanche]
const solNetworks = [solana, solanaTestnet]
const btcNetworks = [bitcoin, bitcoinTestnet]

// ⚙️ Adapters
const wagmiAdapter = new WagmiAdapter({ projectId, networks: evmNetworks })
const solanaAdapter = new SolanaAdapter({})
const bitcoinAdapter = new BitcoinAdapter({})

// 📡 wagmi config
export const wagmiConfig = wagmiAdapter.wagmiConfig

// 🧠 Metadata — matches your deployed site
const metadata = {
  name: 'NeonVault',
  description: 'Creative wallet-gated site',
  url: 'https://ice-man.netlify.app',
  icons: ['https://ice-man.netlify.app/favicon.svg']
}

// 🚀 Create AppKit Instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter, bitcoinAdapter],
  networks: [...evmNetworks, ...solNetworks, ...btcNetworks],
  projectId,
  metadata,
  features: { analytics: true },
  defaultAccountTypes: {
    eip155: 'eoa',
    solana: 'wallet',
    bip122: 'payment'
  },
  walletConnect: {
    relayUrl: 'wss://relay.walletconnect.org', // ✅ correct relay
    projectId,
    metadata
  },
  storageOptions: {
    storageId: 'neonvault_session',
    storage: localStorage
  }
})

// ♻️ Try reconnect
export function useReconnectWallet() {
  useEffect(() => {
    appKit?.autoConnect?.().catch(err => console.warn('Reconnect failed', err))
  }, [])
}

// 🔘 Helper functions
export const openConnectModal = () => appKit.open()
export const openNetworkModal = () => appKit.open({ view: 'Networks' })

// 🌍 Provider
export function AppKitProvider({ children }) {
  useReconnectWallet()
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
}
