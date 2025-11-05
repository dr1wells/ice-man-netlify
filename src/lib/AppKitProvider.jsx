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

// read from env (Vite exposes env vars prefixed with VITE_)
const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID

const evmNetworks = [mantle, mainnet, polygon, arbitrum, base, optimism, bsc, avalanche]
const solNetworks = [solana, solanaTestnet]
const btcNetworks = [bitcoin, bitcoinTestnet]

// adapters
const wagmiAdapter = new WagmiAdapter({ projectId: WC_PROJECT_ID, networks: evmNetworks })
const solanaAdapter = new SolanaAdapter({})
const bitcoinAdapter = new BitcoinAdapter({})

export const wagmiConfig = wagmiAdapter.wagmiConfig

const metadata = {
  name: 'NeonVault',
  description: 'Creative wallet-gated site',
  url: 'https://ice-man.netlify.app', // must exactly match what you added to WalletConnect Cloud
  icons: ['https://ice-man.netlify.app/favicon.svg']
}

export const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter, bitcoinAdapter],
  networks: [...evmNetworks, ...solNetworks, ...btcNetworks],
  projectId: WC_PROJECT_ID,
  metadata,
  features: { analytics: true },
  defaultAccountTypes: {
    eip155: 'eoa',
    solana: 'wallet',
    bip122: 'payment'
  },
  walletConnect: {
    // use the projectId in the relay URL query string
    relayUrl: `wss://relay.walletconnect.com?projectId=${WC_PROJECT_ID}`,
    projectId: WC_PROJECT_ID,
    metadata
  },
  storageOptions: {
    storageId: 'neonvault_session',
    storage: localStorage
  }
})

export function useReconnectWallet() {
  useEffect(() => {
    appKit?.autoConnect?.().catch(err => console.warn('Reconnect failed', err))
  }, [])
}

export const openConnectModal = () => appKit.open()
export const openNetworkModal = () => appKit.open({ view: 'Networks' })

export function AppKitProvider({ children }) {
  useReconnectWallet()
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
}
