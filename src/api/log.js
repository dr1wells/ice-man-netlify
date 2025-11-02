// src/api/log.js
export async function logEvent(event, data = {}) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        data,
        time: new Date().toISOString(),
      }),
    })
  } catch (err) {
    // Only shows in *your* terminal, not user console
    console.error('⚠️ Failed to send log to backend:', err.message)
  }
}

export function logWallet(status, address) {
  logEvent(`Wallet ${status}`, { address })
}

export function logNetworkChange(chain) {
  logEvent('Network change', { name: chain?.name, id: chain?.id })
}
