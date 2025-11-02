// src/lib/evm.js
import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from "ethers";

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

if (!ALCHEMY_KEY) {
  console.warn("Missing VITE_ALCHEMY_API_KEY in environment.");
}

/**
 * ✅ For now, use only Ethereum so it works even if other networks aren’t enabled yet.
 */
const alchemyConfigs = {
  ethereum: new Alchemy({ apiKey: ALCHEMY_KEY, network: Network.ETH_MAINNET }),
};

/**
 * RPC fallback for chains (we'll add more later if needed)
 */
const rpcFallbacks = {
  // Leave empty or add public RPCs later (Polygon, BSC, etc.)
};

function isAlchemyNetworkError(err) {
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

  // --- Ethereum (Alchemy) ---
  await Promise.all(
    Object.entries(alchemyConfigs).map(async ([chain, alchemy]) => {
      try {
        // Native balance
        const native = await alchemy.core.getBalance(address, "latest");
        results.push({
          chain,
          token: "NATIVE",
          balance: ethers.utils.formatEther(native), // ethers v5
        });

        // ERC20 tokens
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
              console.warn(`${chain}: token metadata error for ${t.contractAddress}:`, errToken?.message || errToken);
            }
          }
        }
      } catch (err) {
        if (isAlchemyNetworkError(err)) {
          console.warn(`${chain}: Alchemy not enabled for this app (enable network in dashboard).`);
        } else {
          console.warn(`${chain}: Alchemy query failed:`, err?.message || err);
        }
      }
    })
  );

  // --- RPC fallback (none for now) ---
  await Promise.all(
    Object.entries(rpcFallbacks).map(async ([chain, rpcUrl]) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const bal = await provider.getBalance(address);
        results.push({
          chain,
          token: "NATIVE",
          balance: ethers.utils.formatEther(bal),
        });
      } catch (err) {
        console.warn(`${chain}: RPC failed:`, err?.message || err);
      }
    })
  );

  return results;
}
