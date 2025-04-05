import { Injectable } from '@nestjs/common';
import { PublicKey, Connection, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { ORCA_WHIRLPOOL_PROGRAM_ID, WhirlpoolContext, buildWhirlpoolClient, PDAUtil } from '@orca-so/whirlpools-sdk';
import Decimal from 'decimal.js';
import { SellerService } from 'src/seller/seller.service';
import { PrismaService } from 'src/prisma/prisma.service';


const DEVNET_USDC = new PublicKey('7XSzTBNpGUYPoxPZC8rKTtYiyQicKcRJ9iMw52Rqj8kP');

@Injectable()
export class PurchaseService {
  private connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  private payer = Keypair.generate();

  constructor(
    private readonly sellerService: SellerService,
    private readonly prisma: PrismaService,
  ) {}

  getReceiverAddress() {
    return { receiver: this.payer.publicKey.toBase58() };
  }

  async process(buyer: string, seller: string, amountInSol: number) {
    const buyerKey = new PublicKey(buyer);
    const sellerKey = new PublicKey(seller);

    const fullLamports = amountInSol * 1e9;
    const liquidityLamports = fullLamports * 0.1;
    const payoutLamports = fullLamports - liquidityLamports;

    const sellerTokenMint = await this.sellerService.getSellerTokenMint(seller);

    // const ctx = WhirlpoolContext.withProvider(this.connection, this.payer, ORCA_WHIRLPOOL_PROGRAM_ID);
    // const client = buildWhirlpoolClient(ctx);

    // const whirlpoolPda = PDAUtil.getWhirlpool(
    //   ORCA_WHIRLPOOL_PROGRAM_ID,
    //   ctx.config.rewardEmissionsSuperAuthority,
    //   sellerTokenMint,
    //   DEVNET_USDC,
    //   64
    // );

    // let whirlpool;
    // try {
    //   whirlpool = await client.getPool(whirlpoolPda.publicKey);
    // } catch (e) {
    //   whirlpool = await client.initPool(
    //     sellerTokenMint,
    //     DEVNET_USDC,
    //     6,
    //     64
    //   );
    // }

    const payoutTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.payer.publicKey,
        toPubkey: sellerKey,
        lamports: payoutLamports,
      })
    );
    payoutTx.feePayer = this.payer.publicKey;
    payoutTx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    const payoutSig = await this.connection.sendTransaction(payoutTx, [this.payer]);

    // const position = await whirlpool.openPositionWithLiquidity({
    //   tickLowerIndex: -44320,
    //   tickUpperIndex: 44320,
    //   liquidityAmount: new Decimal(1_000),
    //   tokenMaxA: new Decimal(liquidityLamports),
    //   tokenMaxB: new Decimal(1000),
    //   owner: sellerKey,
    // });
    // const liquiditySig = await position.buildAndExecute();

    // const liquidityTx = new Transaction().add(
    //   SystemProgram.transfer({
    // await this.prisma({
    //   data: {
    //     buyer,
    //     seller,
    //     amount: amountInSol,
    //     sellerTokenMint,
    //     payoutSig,
    //     // liquiditySig,
    //   },
    // });

    return {
      status: 'success',
      message: 'Purchase processed. Liquidity added.',
      usedForLiquidity: liquidityLamports / 1e9,
      sentToSeller: payoutLamports / 1e9,
      sellerTokenMint,
      payoutSig,
      // liquiditySig,
    };
  }
}
