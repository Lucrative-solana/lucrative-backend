import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PublicKey, Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { ORCA_WHIRLPOOL_PROGRAM_ID, WhirlpoolContext, buildWhirlpoolClient, PDAUtil } from '@orca-so/whirlpools-sdk';
import Decimal from 'decimal.js';
import { SellerService } from 'src/seller/seller.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { create } from 'domain';


const DEVNET_USDC = new PublicKey('7XSzTBNpGUYPoxPZC8rKTtYiyQicKcRJ9iMw52Rqj8kP');

@Injectable()
export class PurchaseService {
  private connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  private payer: Keypair;
  constructor(
    private readonly sellerService: SellerService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = JSON.parse(process.env.SOLANA_PAYER_PRIVATE_KEY);
    if (!secretKey) {
      throw new InternalServerErrorException('Missing environment variable: SOLANA_PAYER_PRIVATE_KEY');
    }
    const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
    this.payer = payer;
  }

  getReceiverAddress() {
    return { receiver: this.payer.publicKey.toBase58() };
  }

  async process(buyer: string, seller: string, amountInSol: number, itemId: string, itemName: string, itemDescription: string) {
    console.log('recevied purchase request service:', {
      buyer,
      seller,
      amountInSol,
      itemId,
      itemName,
      itemDescription,
    })

    // 1. DB에서 item 정보 가져오기
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new InternalServerErrorException('Item not found');
    } else {
      console.log('Item found:', item);
    }


    // 1 SOL = 1_000_000_000 lamports
    // 1 SOL = 1e9 lamports

    const sellerWalletAddress = new PublicKey(item.walletAddress);
    const itemPriceInSol = item.price;
    const fullLamports = itemPriceInSol * 1e9;

    // 할인율 기반 유동성 비율 계산
    // 할인율이 0%면: 유동성 비율은 0%
    // 할인율이 5%면: 유동성 비율은 7.5%
    // 할인율이 10%면: 유동성 비율은 15%
    // 할인율이 20%면: 유동성 비율은 30%
    // 할인율이 25%여도 cap 때문에 유동성 비율은 30%
    const liquidityRate = Math.min(item.discountRate * 1.5, 0.3);
    console.log('Liquidity rate:', liquidityRate);

    const liquidityLamports = Math.floor(fullLamports * liquidityRate);
    const payoutLamports = Math.floor(fullLamports - liquidityLamports);

    // const buyerWalletAddress = new PublicKey(buyer);  
    // const sellerWalletAddress = new PublicKey(seller);
    // const fullLamports = amountInSol * 1e9;
    //const liquidityLamports = fullLamports * 0.1;
    // const payoutLamports = fullLamports - liquidityLamports;

    // 판매자에게 지불할 금액을 송금합니다.(Direct Payout)
    console.log('Payout Amount:', payoutLamports);
    const transferIx = SystemProgram.transfer({
      fromPubkey: this.payer.publicKey,
      toPubkey: sellerWalletAddress,
      lamports: payoutLamports,
    });

    console.log('Transfer transaction ready:', {
      from: this.payer.publicKey.toBase58(),
      to: sellerWalletAddress.toBase58(),
      lamports: payoutLamports,
    });
    
    const tx = new Transaction().add(transferIx);
    await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
    
    console.log('Transfer transaction sent:', {
      from: this.payer.publicKey.toBase58(),
      to: sellerWalletAddress.toBase58(),
      lamports: payoutLamports,
    });
    
    // 판매자에게 유동성을 추가합니다.(할인된 금액만큼 유동성 추가)
    const sellerTokenMint = (await this.sellerService.getSellerTokenMint(seller));
    console.log('Seller token mint:', sellerTokenMint);
    console.log('Liquidity amount:', liquidityLamports);

    // Backend 지갑 ATA에 토큰을 민팅합니다.
    await this.sellerService.mintTokenToBackendAta(sellerTokenMint, liquidityLamports);
    console.log('Token minted to backend ATA:', {
      mint: sellerTokenMint,
      amount: liquidityLamports,
    });

    // liquidityLamports와 민팅된 토큰을 유동성 풀에 추가
    // 1. 유동성 풀이 없으면 생성
    // 2. 유동성 풀에 유동성 추가
    // 3. 유동성 풀에 추가된 토큰을 판매자에게 전송

    await this.prisma.purchase.create({
      data: {
        buyer,
        seller,
        amountInSol,
        itemId,
        itemName,
        itemDescription,
        //sellerTokenMint,
        //payoutSig,
        //liquiditySig,
      },
    });
    console.log('Purchase recorded in database:', {
      buyer,
      seller,
      amountInSol,
      itemId,
      itemName,
      itemDescription,
      // sellerTokenMint,
      // payoutSig,
      // liquiditySig,
    });

    return {
      status: 'success',
      message: 'Purchase processed. Liquidity added.',
      usedForLiquidity: liquidityLamports / 1e9,
      sentToSeller: payoutLamports / 1e9,
      // sellerTokenMint,
      // payoutSig,
      // liquiditySig,
    };
  }
}
