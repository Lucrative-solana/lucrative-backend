import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner, percentAmount, signerIdentity } from '@metaplex-foundation/umi';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import { createAndMint, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

@Injectable()
export class SellerService {

  private readonly umi;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = JSON.parse(process.env.SOLANA_PAYER_PRIVATE_KEY);
    if (!secretKey) {
      throw new InternalServerErrorException('Missing environment variable: SOLANA_PAYER_PRIVATE_KEY');
    }

    // Umi 초기화
    this.umi = createUmi('https://api.devnet.solana.com').use(mplToolbox());

    // 기존 지갑 로드
    const keypair = this.umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
    this.umi.use(keypairIdentity(keypair));
  }

  generateLoginMessage(wallet: string) {
    const timestamp = Date.now();
    return `Sign this message to log in: ${wallet}:${timestamp}`;
  }

  verifySignature(wallet: string, message: string, signature: string): boolean {
    const publicKey = new PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
  }

  async getTokenAddress(wallet: string) {
    const existingSeller = await this.prisma.seller.findUnique({
      where: { wallet },
    });

    if (existingSeller) {
      return { tokenMint: existingSeller.tokenMint };
    }
    
    const metadata = {
      name: 'Your Token Name',
      symbol: 'YTN',
      uri: '', // 이미지가 없으므로 빈 문자열로 설정
    }

    const mint = generateSigner(this.umi);

    await createAndMint(this.umi, {
      mint,
      authority: this.umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: 9, //소수점 자리수 설정
      amount: 1_000_000,
      tokenOwner: this.umi.identity.publicKey,
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(this.umi);

    const tokenMint = mint.publicKey.toString();

    console.log('Token Mint Address:', tokenMint);

    await this.prisma.seller.create({
      data: {
        wallet,
        tokenMint: tokenMint,
      },
    });

    return { tokenMint: tokenMint };
  }

  async getSellerTokenMint(wallet: string): Promise<string> {
    const seller = await this.prisma.seller.findUnique({
      where: { wallet },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return seller.tokenMint;
  }
}