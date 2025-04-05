import { Catch, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { findAssociatedTokenPda, mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner, percentAmount, signerIdentity } from '@metaplex-foundation/umi';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { PublicKey as Web3PublicKey } from '@solana/web3.js';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { mintV1, createAndMint, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

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
    const publicKey = new Web3PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
  }

  async createItem(dto: CreateItemDto) {
    const item = await this.prisma.item.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        walletAddress: dto.walletAddress,
        discountRate: dto.discountRate,
        quantity: dto.quantity,
      },
    });
    console.log('Item created:', item);
    return item;
  }

  async findItemsByWallet(walletAddress: string) {
    const items = await this.prisma.item.findMany({
      where: {
        walletAddress: walletAddress,
      },
    });
  
    console.log(`Items for wallet ${walletAddress}:`, items);
    return items;
  }

  async getTokenAddress(body: any) {
    console.log('Generating token mint for wallet:', body.walletAddress);
    const wallet = body.walletAddress;
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

    console.log('Minting token with address:', mint.publicKey.toString());
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
    console.log('Seller created:', { wallet, tokenMint });

    return { tokenMint: tokenMint };
  }

  async mintTokenToBackendAta(mintAddress: string, amount: number) {
    
    const mint = umiPublicKey(mintAddress);
    const decimals = 9;
    const realAmount = amount * Math.pow(10, decimals);

    const backendTokenOwner = this.umi.identity.publicKey;
    const backendAta = await findAssociatedTokenPda(this.umi, {
      mint: mint,
      owner: backendTokenOwner,
    });

    const result = await mintV1(this.umi, {
      mint,
      authority: this.umi.identity, // mint authority = backend wallet
      amount: realAmount,
      tokenOwner: backendTokenOwner,
      tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(this.umi);
    console.log('Mint result:', result);
}

  async getSellerTokenMint(wallet: string): Promise<string> {
    try {
      console.log('Fetching token mint for wallet:', wallet);
      const seller = await this.prisma.seller.findUnique({
        where: { wallet },
      });

      if (!seller) {
        console.log('Seller not found for wallet:', wallet);
        throw new NotFoundException('Seller not found');
      }
      return seller.tokenMint;
    } catch (error) {
      console.error('Error fetching token mint:', error);
      throw new InternalServerErrorException('Error fetching token mint');
    }
  }
}