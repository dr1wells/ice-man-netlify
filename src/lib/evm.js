// src/lib/evm.js
import { ethers } from "ethers";

/**
 * Configuration
 */
const ALCHEMY_KEY =
  import.meta.env.VITE_ALCHEMY_API_KEY || "IGmwxoaYaAcPQl8jLTfOX";
const DEFAULT_TIMEOUT_MS = 6000;
const RETRIES = 2;

/**
 * RPC endpoints — Alchemy + public fallbacks
 */
const CHAINS = {
  ethereum: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  polygon: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  optimism: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  base: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  bnb: "https://bsc-dataseed.binance.org/",
  fantom: "https://rpc.fantom.network",
  gnosis: "https://rpc.gnosischain.com",
  cronos: "https://evm.cronos.org",
};

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Timeout wrapper
 */
const withTimeout = (p, ms = DEFAULT_TIMEOUT_MS, label = "") =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`⏳ Timeout (${ms}ms): ${label}`)), ms)
    ),
  ]);

/**
 * Retry wrapper (with backoff)
 */
async function retry(fn, times = RETRIES) {
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === times - 1) throw err;
      await sleep(400 * 2 ** i);
    }
  }
}

/**
 * Fetch native balances across all EVM networks
 */
export async function getEvmBalances(address) {
  if (!address) {
    console.warn("⚠️ getEvmBalances: address required");
    return [];
  }

  console.log("🔍 Fetching balances for:", address);

  // Run all network queries concurrently
  const results = await Promise.allSettled(
    Object.entries(CHAINS).map(async ([chain, rpc]) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(rpc);

        const balance = await retry(() =>
          withTimeout(provider.getBalance(address), DEFAULT_TIMEOUT_MS, chain)
        );

        const formatted = ethers.utils.formatEther(balance);
        console.log(`💰 ${chain}: ${formatted}`);
        return { chain, token: "NATIVE", balance: formatted };
      } catch (err) {
        const msg = String(err.message || err);
        if (msg.includes("403")) {
          console.warn(
            `${chain}: ⚠️ Alchemy network not enabled for this key (skipping)`
          );
        } else {
          console.warn(`${chain}: RPC failed: ${msg}`);
        }
        return null;
      }
    })
  );

  // Collect valid results only
  const final = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);

  console.log("✅ Done fetching balances. Items:", final.length);
  console.log("💰 Final EVM Balances:", final);
  return final;
}
