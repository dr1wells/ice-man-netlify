// src/components/ConnectModal.jsx
import React, { useEffect } from 'react'

export default function ConnectModal({ open, onClose, onOpenAppKit }) {
  useEffect(() => {
    if (open) {
      // Automatically open AppKit when the modal opens
      onOpenAppKit?.()
    }
  }, [open, onOpenAppKit])

  if (!open) return null

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <strong>Connect Wallet</strong>
          <button onClick={onClose} style={xbtn}>×</button>
        </div>

        <div style={body}>
          <p>Opening AppKit wallet selector...</p>
          <p style={hint}>
            Supports: Ethereum, Polygon, Base, BSC, Arbitrum, Optimism, Avalanche, Mantle, Solana, and Bitcoin.
          </p>
        </div>
      </div>
    </div>
  )
}

// inline styles
const backdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50
}

const sheet = {
  width: 520,
  maxWidth: '95vw',
  background: '#0b1220',
  color: '#e6ebff',
  borderRadius: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  borderBottom: '1px solid #1b2335'
}

const xbtn = {
  background: 'transparent',
  color: '#9fb0d0',
  border: 'none',
  fontSize: 22,
  cursor: 'pointer'
}

const body = { padding: '16px 16px 24px' }
const hint = { color: '#9fb0d0', fontSize: 12, marginTop: 8 }
