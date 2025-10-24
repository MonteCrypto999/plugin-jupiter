import { JupiterService } from '../service';
import type { IAgentRuntime } from '@elizaos/core';

// Minimal runtime mock for direct usage
const runtime: IAgentRuntime = {
  logger: console as any,
  getService: (() => null) as any,
  getServiceLoadPromise: (() => Promise.resolve()) as any,
  getProvider: (() => null) as any,
  getSetting: ((key: string) => process.env[key]) as any,
  getCache: (async () => ({ exp: 0, data: null })) as any,
  setCache: (async () => {}) as any,
} as unknown as IAgentRuntime;

async function main() {
  const inputMint = process.env.TEST_INPUT_MINT || 'So11111111111111111111111111111111111111112'; // WSOL
  const outputMint = process.env.TEST_OUTPUT_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
  const amount = Number(process.env.TEST_INPUT_AMOUNT_ATOMIC || '100000'); // 0.0001 SOL
  const slippageBps = Number(process.env.TEST_SLIPPAGE_BPS || '50');

  const feeBps = Number(process.env.REFERRAL_FEE_BPS || '0');
  const mode = process.env.REFERRAL_MODE || 'smart';
  const receiver = process.env.REFERRAL_FEE_RECEIVER || '';

  console.log('E2E Mainnet - Params', { inputMint, outputMint, amount, slippageBps, feeBps, mode, receiver });

  const service = new JupiterService(runtime);

  const quote = await service.getQuote({
    inputMint,
    outputMint,
    amount,
    slippageBps,
  });
  console.log('Quote ok. outAmount=', (quote as any)?.outAmount);

  const userPublicKey = process.env.E2E_USER_PUBLIC_KEY || receiver || '11111111111111111111111111111111';

  const swap = await service.executeSwap({
    quoteResponse: quote as any,
    userPublicKey,
    slippageBps,
  });
  console.log('Swap transaction drafted. keys=', Object.keys(swap));
}

main().catch((e) => {
  console.error('E2E failed:', e?.message || e);
  process.exit(1);
});
