import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';

@Injectable()
export class SellerService {
  private connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  private payer: Keypair;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = process.env.SOLANA_PAYER_PRIVATE_KEY;
    if (!secretKey) {
      throw new InternalServerErrorException('Missing environment variable: SOLANA_PAYER_SECRET_KEY');
    }
    this.payer = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(secretKey))
    );
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

  async loginSeller(wallet: string) {
    // DB에 이미 등록된 셀러인지 확인
    const existingSeller = await this.prisma.seller.findUnique({
      where: { wallet },
    });

    if (existingSeller) {
      return { tokenMint: existingSeller.tokenMint };
    }
    
    // // 토큰 발행
    // const sellerPubkey = new PublicKey(wallet);

    // const mint = await createMint(
    //   this.connection,
    //   this.payer,
    //   this.payer.publicKey,
    //   sellerPubkey,
    //   6
    // );

    // const sellerAta = await getOrCreateAssociatedTokenAccount(
    //   this.connection,
    //   this.payer,
    //   mint,
    //   sellerPubkey
    // );
    // // 900 tokens with 6 decimals (900 * 10^6)
    // await mintTo(
    //   this.connection,
    //   this.payer,
    //   mint,
    //   sellerAta.address,
    //   this.payer,
    //   900_000_000
    // );

    // const payerAta = await getOrCreateAssociatedTokenAccount(
    //   this.connection,
    //   this.payer,
    //   mint,
    //   this.payer.publicKey
    // );
    // await mintTo(
    //   this.connection,
    //   this.payer,
    //   mint,
    //   payerAta.address,
    //   this.payer,
    //   100_000_000
    // );

    // // DB에 저장
    // const newSeller = await this.prisma.seller.create({
    //   data: {
    //     wallet,
    //     tokenMint: mint.toBase58(),
    //   },
    // });

    // return { tokenMint: mint.toBase58() };
    
    // 👉 테스트용 임시 응답
    return {
      tokenMint: 'TEST_TOKEN_MINT',
      message: '✅ registerSeller stubbed: Token mint skipped for testing.',
    };
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