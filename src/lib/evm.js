// src/lib/evm.js
import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from "ethers";

/**
 * Tunables
 */
const DEFAULT_TIMEOUT_MS = 6000; // per-network call timeout
const RETRIES = 2; // number of retries for transient failures
const TOKEN_META_CONCURRENCY = 6; // concurrent token metadata requests

// Use env key (falls back to your key string if missing so dev works)
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || "IGmwxoaYaAcPQl8jLTfOX";

if (!import.meta.env.VITE_ALCHEMY_API_KEY) {
  console.warn("⚠️ VITE_ALCHEMY_API_KEY not set in .env — using fallback key (dev only).");
}

/**
 * Alchemy-backed networks (only works if enabled in your app dashboard)
 */
const alchemyConfigs = {
  ethereum: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ETH_MAINNET }),
  polygon: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.MATIC_MAINNET }),
  arbitrum: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ARB_MAINNET }),
  optimism: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.OPT_MAINNET }),
  base: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.BASE_MAINNET }),
  avalanche: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.AVAX_MAINNET }),
};

/**
 * Public RPC fallbacks for chains Alchemy doesn't support / you prefer
 * Pick stable endpoints; if resolution fails or network not available, they'll be skipped.
 */
const rpcFallbacks = {
  bnb: "https://bsc-dataseed1.binance.org",
  fantom: "https://rpc.fantom.network",
  gnosis: "https://rpc.gnosischain.com",
  cronos: "https://evm.cronos.org",
};

/* --- helpers --- */

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function isAlchemyNetworkError(err) {
  const msg = String(err?.message || err || "");
  return msg.toLowerCase().includes("not enabled") || msg.includes("403");
}

/**
 * Promise with timeout wrapper
 */
function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS, label = "") {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`Timeout (${ms}ms) ${label}`)), ms)
    ),
  ]);
}

/**
 * Retry wrapper with exponential backoff
 */
async function retry(fn, attempts = RETRIES + 1, baseDelay = 400, label = "") {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // If it's clearly a permanent Alchemy network error, don't retry
      if (isAlchemyNetworkError(err)) throw err;
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * p-limit style concurrency helper
 */
function pMap(iterable, mapper, concurrency = 6) {
  const items = Array.from(iterable);
  let i = 0;
  const results = new Array(items.length);
  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await mapper(items[idx], idx);
    }
  });
  return Promise.all(workers).then(() => results);
}

/* --- main API --- */

/**
 * Fetch balances across Alchemy-backed chains + RPC fallbacks.
 * Returns: [{ chain, token, name?, address?, balance: "123.456" }, ...]
 */
export async function getEvmBalances(address) {
  if (!address) {
    console.warn("getEvmBalances: address required");
    return [];
  }

  console.log("🔍 Starting balance detection for", address);

  const results = [];

  // assemble all tasks: Alchemy chains and RPC-chains
  const alchemyEntries = Object.entries(alchemyConfigs);
  const rpcEntries = Object.entries(rpcFallbacks);

  // --- 1) Alchemy chains (native + token balances) in parallel ---
  const alchemyPromises = alchemyEntries.map(async ([chain, alchemy]) => {
    try {
      // native balance (with retry + timeout)
      const native = await retry(
        () => withTimeout(alchemy.core.getBalance(address, "latest"), DEFAULT_TIMEOUT_MS, `${chain} native`),
        RETRIES + 1,
        400,
        `${chain} native`
      );

      results.push({
        chain,
        token: "NATIVE",
        balance: ethers.formatEther(native || "0"),
      });

      // token balances (we fetch first, then metadata in parallel with limited concurrency)
      const tokenResponse = await retry(
        () => withTimeout(alchemy.core.getTokenBalances(address), DEFAULT_TIMEOUT_MS, `${chain} tokenBalances`),
        RETRIES + 1,
        400,
        `${chain} tokenBalances`
      );

      const tokenBalances = tokenResponse?.tokenBalances || [];
      const positiveTokens = tokenBalances.filter((t) => t && t.tokenBalance && t.tokenBalance !== "0");

      if (positiveTokens.length) {
        // metadata fetches limited by TOKEN_META_CONCURRENCY
        await pMap(
          positiveTokens,
          async (t) => {
            try {
              const meta = await retry(
                () => withTimeout(alchemy.core.getTokenMetadata(t.contractAddress), DEFAULT_TIMEOUT_MS, `${chain} meta ${t.contractAddress}`),
                RETRIES + 1,
                300,
                `${chain} meta ${t.contractAddress}`
              );

              const decimals = typeof meta?.decimals === "number" ? meta.decimals : 18;
              const balanceStr = ethers.formatUnits(t.tokenBalance, decimals);

              results.push({
                chain,
                token: meta?.symbol || "UNKNOWN",
                name: meta?.name || "Unknown Token",
                balance: balanceStr,
                address: t.contractAddress,
              });
            } catch (err) {
              // skip token metadata errors but log
              console.warn(`${chain}: token meta failed for ${t.contractAddress}:`, err?.message || err);
            }
          },
          TOKEN_META_CONCURRENCY
        );
      }
    } catch (err) {
      if (isAlchemyNetworkError(err)) {
        console.warn(`${chain}: ⚠️ Alchemy network not enabled for this key (skipping)`);
      } else {
        console.warn(`${chain}: Alchemy query failed:`, err?.message || err);
      }
    }
  });

  // --- 2) RPC fallback chains in parallel ---
  const rpcPromises = rpcEntries.map(async ([chain, rpcUrl]) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const native = await retry(
        () => withTimeout(provider.getBalance(address), DEFAULT_TIMEOUT_MS, `${chain} rpc native`),
        RETRIES + 1,
        400,
        `${chain} rpc native`
      );

      results.push({
        chain,
        token: "NATIVE",
        balance: ethers.formatEther(native || 0),
      });
    } catch (err) {
      console.warn(`${chain}: RPC failed:`, err?.message || err);
    }
  });

  // Fire off all (Alchemy + RPC) concurrently
  await Promise.all([...alchemyPromises, ...rpcPromises]);

  // Aggregate/sanitize results:
  // - group by chain + token + address (if present) and sum balances numerically
  const grouped = {};
  for (const r of results) {
    const key = `${r.chain}::${r.address ?? r.token}`;
    const cur = grouped[key] || { chain: r.chain, token: r.token, name: r.name, address: r.address, balance: 0 };
    // parse numeric safely
    const val = Number(r.balance) || 0;
    cur.balance = Number(cur.balance) + val;
    grouped[key] = cur;
  }

  const final = Object.values(grouped).map((g) => ({
    chain: g.chain,
    token: g.token,
    name: g.name,
    address: g.address,
    // stringify with up to 18 decimals trimmed to 9 for display (you can format later)
    balance: Number(g.balance).toString(),
  }));

  console.log("✅ Done fetching balances. Items:", final.length);
  return final;
}
