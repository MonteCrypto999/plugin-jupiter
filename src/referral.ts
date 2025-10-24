import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import type { ReferralConfig, FeeMintSelection, FeeMode } from './types';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Load referral configuration from environment variables
 */
export function loadReferralConfig(): ReferralConfig {
  const feeBps = parseInt(process.env.REFERRAL_FEE_BPS || '0', 10);
  const mode = (process.env.REFERRAL_MODE || 'smart') as FeeMode;
  
  return {
    enabled: feeBps > 0,
    feeBps,
    mode,
  };
}

/**
 * Select the mint to use for fee collection based on mode and swap pair
 */
export function selectFeeMint(
  inputMint: string,
  outputMint: string,
  mode: FeeMode
): string | null {
  if (mode === 'sol_only') {
    // Prefer SOL/WSOL if available in the pair
    if (inputMint === WSOL_MINT) return inputMint;
    if (outputMint === WSOL_MINT) return outputMint;
    return null; // No SOL in pair, no fee
  }
  
  // Smart mode: prefer SOL if available, otherwise use input mint
  if (inputMint === WSOL_MINT || outputMint === WSOL_MINT) {
    return WSOL_MINT;
  }
  
  // Default to input mint for ExactIn compatibility
  return inputMint;
}

/**
 * Derive the associated token account address for a given owner and mint
 */
export function deriveFeeAccount(
  ownerPublicKey: string,
  mint: string
): string | null {
  try {
    const owner = new PublicKey(ownerPublicKey);
    const mintPubkey = new PublicKey(mint);
    const ata = getAssociatedTokenAddressSync(mintPubkey, owner);
    return ata.toBase58();
  } catch (error) {
    console.warn('Failed to derive fee account:', error);
    return null;
  }
}

/**
 * Get fee mint selection for a swap
 */
export function getFeeMintSelection(
  inputMint: string,
  outputMint: string,
  config: ReferralConfig,
  feeReceiverPublicKey?: string
): FeeMintSelection | null {
  if (!config.enabled) {
    return null;
  }
  
  const selectedMint = selectFeeMint(inputMint, outputMint, config.mode);
  
  if (!selectedMint) {
    return null;
  }
  
  let feeAccount: string | undefined;
  
  if (feeReceiverPublicKey) {
    feeAccount = deriveFeeAccount(feeReceiverPublicKey, selectedMint) || undefined;
  }
  
  return {
    mint: selectedMint,
    feeAccount,
  };
}

