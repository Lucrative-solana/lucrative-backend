import { config } from 'dotenv';
config();

import { Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

// 1. 비밀키 불러오기
const rawKey = process.env.SOLANA_PAYER_PRIVATE_KEY;

if (!rawKey) {
  console.error('❌ .env에 PRIVATE_KEY가 설정되어 있지 않습니다.');
  process.exit(1);
}

let secretKey: Uint8Array;
try {
  const keyArray = JSON.parse(rawKey);
  secretKey = Uint8Array.from(keyArray);
} catch (e) {
  console.error('❌ PRIVATE_KEY 형식이 잘못되었습니다.');
  process.exit(1);
}

// 2. Keypair 생성
const keypair = Keypair.fromSecretKey(secretKey);

// 3. 메시지 생성
const timestamp = Date.now();
const message = `Sign this message to log in: ${keypair.publicKey.toBase58()}:${timestamp}`;
const messageBytes = new TextEncoder().encode(message);

// 4. 서명 생성
const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
const signatureBase58 = bs58.encode(signatureBytes);

// 5. 결과 출력
const result = {
  wallet: keypair.publicKey.toBase58(),
  message,
  signature: signatureBase58,
};

console.log(JSON.stringify(result, null, 2));