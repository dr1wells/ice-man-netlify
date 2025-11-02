// src/lib/evm.js
import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from "ethers";

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

if (!ALCHEMY_KEY) {
  console.warn("Missing VITE_ALCHEMY_API_KEY in environment.");
}

/**
 * Alchemy-backed networks.
 * Keep these, but note: each network must be enabled in your Alchemy app settings,
 * otherwise Alchemy will return 403 and we skip it.
 */
const alchemyConfigs = {
  ethereum: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ETH_MAINNET }),
  polygon: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.MATIC_MAINNET }),
  arbitrum: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ARB_MAINNET }),
  optimism: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.OPT_MAINNET }),
  base: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.BASE_MAINNET }),
  zksync: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ZKSYNC_MAINNET }),
  scroll: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.SCROLL_MAINNET }),
  // starknet is not EVM in the same sense; leave if you intend to use it separately
};

/**
 * RPC fallback for chains Alchemy doesn't support for you, or public RPCs you prefer
 */
const rpcFallbacks = {
  bsc: "https://bsc-dataseed.binance.org",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  fantom: "https://rpc.ankr.com/fantom",
  // add more RPCs here if you need them
};

function isAlchemyNetworkError(err) {
  // common Alchemy 403 response contains 'not enabled' text or status in message
  const msg = String(err && (err.message || err?.toString?.() || err));
  return msg.toLowerCase().includes("not enabled") || msg.toLowerCase().includes("403");
}

/**
 * Returns array of balances: [{ chain, token, balance, address? }, ...]
 */
export async function getEvmBalances(address) {
  if (!address) {
    console.warn("getEvmBalances: address required");
    return [];
  }

  const results = [];

  // --- Alchemy networks first ---
  await Promise.all(
    Object.entries(alchemyConfigs).map(async ([chain, alchemy]) => {
      try {
        // Native balance (Alchemy SDK returns BigNumber-like)
        const native = await alchemy.core.getBalance(address, "latest");
        results.push({
          chain,
          token: "NATIVE",
          balance: ethers.utils.formatEther(native), // ethers v5
        });

        // ERC20 tokens via Alchemy
        const tokenData = await alchemy.core.getTokenBalances(address);
        if (tokenData && Array.isArray(tokenData.tokenBalances)) {
          for (const t of tokenData.tokenBalances) {
            try {
              if (!t.tokenBalance || t.tokenBalance === "0") continue;
              const meta = await alchemy.core.getTokenMetadata(t.contractAddress);
              const decimals = (meta && meta.decimals) || 18;
              const formatted = ethers.utils.formatUnits(t.tokenBalance, decimals);
              results.push({
                chain,
                token: (meta && meta.symbol) || "UNKNOWN",
                name: (meta && meta.name) || "Unknown Token",
                balance: formatted,
                address: t.contractAddress,
              });
            } catch (errToken) {
              console.warn(`${chain}: token metadata error for ${t.contractAddress}:`, errToken && errToken.message ? errToken.message : errToken);
            }
          }
        }
      } catch (err) {
        if (isAlchemyNetworkError(err)) {
          console.warn(`${chain}: Alchemy not enabled for this app (enable network in dashboard).`);
        } else {
          console.warn(`${chain}: Alchemy query failed:`, err && (err.message || err));
        }
        // continue without throwing
      }
    })
  );

  // --- RPC fallback networks (BSC, AVAX, Fantom, etc) ---
  await Promise.all(
    Object.entries(rpcFallbacks).map(async ([chain, rpcUrl]) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl); // ethers v5
        const bal = await provider.getBalance(address);
        results.push({
          chain,
          token: "NATIVE",
          balance: ethers.utils.formatEther(bal),
        });
      } catch (err) {
        console.warn(`${chain}: RPC failed:`, err && (err.message || err));
      }
    })
  );

  // final
  return results;
}
