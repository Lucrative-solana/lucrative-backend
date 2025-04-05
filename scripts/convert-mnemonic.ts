// scripts/convert-mnemonic.ts
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import 'dotenv/config';

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error('❌ MNEMONIC not set in .env');
  }
  
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const path = "m/44'/501'/0'/0'";
  const derivedSeed = derivePath(path, seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  const secretArray = Array.from(keypair.secretKey);

  console.log('✅ .env에 아래 값을 복사하세요:\n');
  console.log(`PAYER_PRIVATE_KEY=${JSON.stringify(secretArray)}`);
}

main().catch(console.error);
