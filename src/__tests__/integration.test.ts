import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { JupiterService } from '../service';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Mock runtime
const mockRuntime: any = {
  logger: {
    success: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
  getSetting: (key: string) => null,
  getCache: async () => ({ exp: 0, data: null }),
  setCache: async () => {},
};

describe('Jupiter Service Integration', () => {
  let service: JupiterService;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    service = new JupiterService(mockRuntime);
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Quote with Referral Fees', () => {
    it('should include platformFeeBps when referral is enabled', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'smart';

      let capturedUrl = '';
      globalThis.fetch = async (input: any) => {
        capturedUrl = typeof input === 'string' ? input : input.toString();
        return new Response(JSON.stringify({
          inputMint: WSOL_MINT,
          outputMint: USDC_MINT,
          inAmount: '100000',
          outAmount: '99000',
          routePlan: [],
        }), { status: 200 });
      };

      await service.getQuote({
        inputMint: WSOL_MINT,
        outputMint: USDC_MINT,
        amount: 100000,
        slippageBps: 50,
      });

      expect(capturedUrl).toContain('platformFeeBps=20');

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
    });

    it('should not include platformFeeBps when referral is disabled', async () => {
      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;

      let capturedUrl = '';
      globalThis.fetch = async (input: any) => {
        capturedUrl = typeof input === 'string' ? input : input.toString();
        return new Response(JSON.stringify({
          inputMint: WSOL_MINT,
          outputMint: USDC_MINT,
          inAmount: '100000',
          outAmount: '99000',
          routePlan: [],
        }), { status: 200 });
      };

      await service.getQuote({
        inputMint: WSOL_MINT,
        outputMint: USDC_MINT,
        amount: 100000,
        slippageBps: 50,
      });

      expect(capturedUrl).not.toContain('platformFeeBps');
    });
  });

  describe('Swap with Fee Account', () => {
    it('should include feeAccount when referral is enabled', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'smart';

      let capturedBody: any = null;
      globalThis.fetch = async (input: any, init?: any) => {
        if (init?.method === 'POST') {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify({
          swapTransaction: 'BASE64_TX',
          lastValidBlockHeight: 12345,
        }), { status: 200 });
      };

      const mockQuote = {
        inputMint: WSOL_MINT,
        outputMint: USDC_MINT,
        inAmount: '100000',
        outAmount: '99000',
      };

      await service.executeSwap({
        quoteResponse: mockQuote,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });

      expect(capturedBody).toBeTruthy();
      expect(capturedBody.feeAccount).toBeTruthy();

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
    });

    it('should not include feeAccount when referral is disabled', async () => {
      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;

      let capturedBody: any = null;
      globalThis.fetch = async (input: any, init?: any) => {
        if (init?.method === 'POST') {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify({
          swapTransaction: 'BASE64_TX',
          lastValidBlockHeight: 12345,
        }), { status: 200 });
      };

      const mockQuote = {
        inputMint: WSOL_MINT,
        outputMint: USDC_MINT,
        inAmount: '100000',
        outAmount: '99000',
      };

      await service.executeSwap({
        quoteResponse: mockQuote,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });

      expect(capturedBody).toBeTruthy();
      expect(capturedBody.feeAccount).toBeUndefined();
    });
  });

  describe('Fee Mode Selection', () => {
    it('should select SOL in sol_only mode when available', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'sol_only';

      let capturedBody: any = null;
      globalThis.fetch = async (input: any, init?: any) => {
        if (init?.method === 'POST') {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify({
          swapTransaction: 'BASE64_TX',
          lastValidBlockHeight: 12345,
        }), { status: 200 });
      };

      const mockQuote = {
        inputMint: WSOL_MINT,
        outputMint: USDC_MINT,
        inAmount: '100000',
        outAmount: '99000',
      };

      await service.executeSwap({
        quoteResponse: mockQuote,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });

      expect(capturedBody.feeAccount).toBeTruthy();

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
    });

    it('should not add feeAccount in sol_only mode when SOL not in pair', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'sol_only';

      let capturedBody: any = null;
      globalThis.fetch = async (input: any, init?: any) => {
        if (init?.method === 'POST') {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify({
          swapTransaction: 'BASE64_TX',
          lastValidBlockHeight: 12345,
        }), { status: 200 });
      };

      const mockQuote = {
        inputMint: USDC_MINT,
        outputMint: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        inAmount: '100000',
        outAmount: '99000',
      };

      await service.executeSwap({
        quoteResponse: mockQuote,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });

      expect(capturedBody.feeAccount).toBeUndefined();

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
    });
  });
});

