import { describe, it, expect, beforeEach } from 'bun:test';
import {
  loadReferralConfig,
  selectFeeMint,
  deriveFeeAccount,
  getFeeMintSelection,
} from '../referral';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TEST_OWNER = '11111111111111111111111111111111';

describe('Referral Config', () => {
  beforeEach(() => {
    delete process.env.REFERRAL_FEE_BPS;
    delete process.env.REFERRAL_MODE;
  });

  it('loads default config when env vars missing', () => {
    const config = loadReferralConfig();
    expect(config.enabled).toBe(false);
    expect(config.feeBps).toBe(0);
    expect(config.mode).toBe('smart');
  });

  it('loads config from env vars', () => {
    process.env.REFERRAL_FEE_BPS = '20';
    process.env.REFERRAL_MODE = 'sol_only';
    
    const config = loadReferralConfig();
    expect(config.enabled).toBe(true);
    expect(config.feeBps).toBe(20);
    expect(config.mode).toBe('sol_only');
  });

  it('enables when feeBps > 0', () => {
    process.env.REFERRAL_FEE_BPS = '50';
    
    const config = loadReferralConfig();
    expect(config.enabled).toBe(true);
  });
});

describe('Fee Mint Selection', () => {
  it('selects WSOL in sol_only mode when input is SOL', () => {
    const mint = selectFeeMint(WSOL_MINT, USDC_MINT, 'sol_only');
    expect(mint).toBe(WSOL_MINT);
  });

  it('selects WSOL in sol_only mode when output is SOL', () => {
    const mint = selectFeeMint(USDC_MINT, WSOL_MINT, 'sol_only');
    expect(mint).toBe(WSOL_MINT);
  });

  it('returns null in sol_only mode when no SOL in pair', () => {
    const mint = selectFeeMint(USDC_MINT, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'sol_only');
    expect(mint).toBeNull();
  });

  it('prefers WSOL in smart mode when available', () => {
    const mint = selectFeeMint(WSOL_MINT, USDC_MINT, 'smart');
    expect(mint).toBe(WSOL_MINT);
  });

  it('falls back to input mint in smart mode when no SOL', () => {
    const mint = selectFeeMint(USDC_MINT, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'smart');
    expect(mint).toBe(USDC_MINT);
  });
});

describe('Fee Account Derivation', () => {
  it('derives ATA for valid owner and mint', () => {
    const feeAccount = deriveFeeAccount(TEST_OWNER, WSOL_MINT);
    expect(feeAccount).toBeTruthy();
    expect(typeof feeAccount).toBe('string');
  });

  it('returns null for invalid owner', () => {
    const feeAccount = deriveFeeAccount('invalid', WSOL_MINT);
    expect(feeAccount).toBeNull();
  });

  it('returns null for invalid mint', () => {
    const feeAccount = deriveFeeAccount(TEST_OWNER, 'invalid');
    expect(feeAccount).toBeNull();
  });
});

describe('Get Fee Mint Selection', () => {
  it('returns null when config disabled', () => {
    const config = { enabled: false, feeBps: 0, mode: 'smart' as const };
    const selection = getFeeMintSelection(WSOL_MINT, USDC_MINT, config);
    expect(selection).toBeNull();
  });

  it('returns mint without feeAccount when no owner provided', () => {
    const config = { enabled: true, feeBps: 20, mode: 'smart' as const };
    const selection = getFeeMintSelection(WSOL_MINT, USDC_MINT, config);
    expect(selection).toBeTruthy();
    expect(selection?.mint).toBe(WSOL_MINT);
    expect(selection?.feeAccount).toBeUndefined();
  });

  it('returns mint with feeAccount when owner provided', () => {
    const config = { enabled: true, feeBps: 20, mode: 'smart' as const };
    const selection = getFeeMintSelection(WSOL_MINT, USDC_MINT, config, TEST_OWNER);
    expect(selection).toBeTruthy();
    expect(selection?.mint).toBe(WSOL_MINT);
    expect(selection?.feeAccount).toBeTruthy();
  });

  it('returns null in sol_only mode when no SOL in pair', () => {
    const config = { enabled: true, feeBps: 20, mode: 'sol_only' as const };
    const selection = getFeeMintSelection(USDC_MINT, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', config);
    expect(selection).toBeNull();
  });
});

