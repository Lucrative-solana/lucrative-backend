import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { 
  PublicKey, 
  Connection, 
  Keypair, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { SellerService } from 'src/seller/seller.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  setPayerFromBytes,
  setRpc,
  createSplashPoolInstructions,
  openFullRangePositionInstructions,
  setWhirlpoolsConfig,
  setDefaultFunder,
  fetchSplashPool,
  createSplashPool,
} from '@orca-so/whirlpools';
import {
  createSolanaRpc,
  address,
  pipe,
  devnet,
  createKeyPairSignerFromBytes,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  prependTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getComputeUnitEstimateForTransactionMessageFactory,
  getBase64EncodedWireTransaction,
  setTransactionMessageFeePayerSigner
} from '@solana/kit';
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction
} from '@solana-program/compute-budget';
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

@Injectable()
export class PurchaseService {
  private connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  private payer: Keypair;
  constructor(
    private readonly sellerService: SellerService,
    private readonly prisma: PrismaService,
  ) {
    this.initialize();
  }

  private async initialize() {
    const secretKey = JSON.parse(process.env.SOLANA_PAYER_PRIVATE_KEY);
    if (!secretKey) {
      throw new InternalServerErrorException('Missing environment variable: SOLANA_PAYER_PRIVATE_KEY');
    }
    const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
    this.payer = payer;
    await setPayerFromBytes(this.payer.secretKey);
    await setRpc(this.connection.rpcEndpoint);
    const wallet = await createKeyPairSignerFromBytes(this.payer.secretKey);
    await setDefaultFunder(wallet)
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

    // DB에서 item 정보 가져오기
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
    const itemPriceInSol = item.price / 170000; // temp price
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
    console.log('Adding liquidity to seller:')
    const sellerTokenMint = (await this.sellerService.getSellerTokenMint(seller));
    console.log('Seller token mint:', sellerTokenMint);
    console.log('Liquidity amount:', liquidityLamports);

    // Backend 지갑 ATA에 토큰을 민팅합니다.
    await this.sellerService.mintTokenToBackendAta(sellerTokenMint, liquidityLamports);
    console.log('Token minted to backend ATA:', {
      mint: sellerTokenMint,
      amount: liquidityLamports,
    });

    // 유동성 풀 생성 시작.
    await setWhirlpoolsConfig('solanaDevnet');
    const devnetRpc = createSolanaRpc(devnet('https://api.devnet.solana.com'));
    const rpc = devnetRpc; // Define rpc as the Solana RPC client
    const wallet = await createKeyPairSignerFromBytes(this.payer.secretKey);

    const tokenMintOne = address("So11111111111111111111111111111111111111112"); // SOL
    const tokenMintTwo = address(sellerTokenMint);
    // const tokenMintTwo = address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"); // devUSDC
    // const tokenMintTwo = address('43hotxWdt5efQi7aJwRVpexZBcHMKNaNn9Z4dG7QxJeT'); // token without pool creation
    const initialPrice = 1;

    // 기존 유동성 풀 정보 확인
    console.log('Fetching pool info...');
    const poolInfo = await fetchSplashPool(
      devnetRpc,
      tokenMintOne,
      tokenMintTwo
    );

    if (poolInfo.initialized) {
      console.log('Pool is initialized:', poolInfo);
    } else {
      console.log('Pool is not initialized:', poolInfo);
      // 유동성 풀이 없을 경우 새로 생성

      const { poolAddress, instructions, initializationCost } = await createSplashPoolInstructions(
        devnetRpc,
        tokenMintOne,
        tokenMintTwo,
        initialPrice,
        wallet
      );
      
      console.log(`Pool Address: ${poolAddress}`);
      console.log(`Initialization Cost: ${initializationCost} lamports`);

      await this.sendInstrctionsWithWallet(instructions, wallet);
      console.log('Pool created:');

    };

    // 유동성 풀에 자산 추가
    console.log('Adding liquidity...');
    const whirlpoolAddress = address(poolInfo.address);

    const param = { 
      tokenA: BigInt(liquidityLamports),
      tokenB: BigInt(liquidityLamports),
    };

    const { quote, instructions, initializationCost, positionMint } = await openFullRangePositionInstructions(
      devnetRpc,
      whirlpoolAddress,
      param,
      100,
      wallet
    );

    await this.sendInstrctionsWithWallet(instructions, wallet);
    console.log('Liquidity added:')

    console.log(`Quote token max B: ${quote.tokenMaxB}`);
    console.log(`Initialization cost: ${initializationCost}`);
    console.log(`Position mint: ${positionMint}`);

    // 유동성 풀에 추가된 토큰을 판매자에게 전송
    console.log('Transferring token to seller:');

    // 지갑 및 토큰 정보 설정
    const payer = this.payer /* 지불자 키페어 */;

    (async () => {
      console.log('판매자에게 토큰 전송을 시작합니다.');
    
      const fromWallet = payer.publicKey;
      const toWallet = new PublicKey(sellerWalletAddress);
      const mint = new PublicKey(positionMint);

      console.log('보내는 지갑:', fromWallet.toBase58());
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payer,
        mint,
        fromWallet,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID // Token-2022 프로그램 ID 지정
      );
    
      console.log('받는 지갑:', toWallet.toBase58());
      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payer,
        mint,
        toWallet,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID // Token-2022 프로그램 ID 지정
      );
    
      const amount = 1;
    
      // 전송 인스트럭션 생성
      const transferInstruction = createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID // Token-2022 프로그램 ID 지정
      );
    
      console.log('전송 인스트럭션 생성 완료:', {
        from: fromTokenAccount.address.toBase58(),
        to: toTokenAccount.address.toBase58(),
        amount,
      });
    
      // 트랜잭션 생성 및 서명
      const transaction = new Transaction().add(transferInstruction);
      await sendAndConfirmTransaction(this.connection, transaction, [payer]);
    
      console.log('토큰이 판매자에게 성공적으로 전송되었습니다:', {
        from: fromWallet.toBase58(),
        to: toWallet.toBase58(),
        amount,
      });
    })();

    // 전송 작업 완료 후 DB에 기록
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
  private async sendInstrctionsWithWallet(instructions: any[], wallet: any) {
    console.log('Sending instructions with wallet:', {
      instructions,
      walletAddress: wallet.address,
    });
    const devnetRpc = createSolanaRpc(devnet('https://api.devnet.solana.com'));
    const rpc = devnetRpc; // Define rpc as the Solana RPC client
    
    // Create Transaction Message From Instructions
    const latestBlockHash = await rpc.getLatestBlockhash().send();
    const transactionMessage = await pipe(
      createTransactionMessage({ version: 0}),
      tx => setTransactionMessageFeePayer(wallet.address, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockHash.value, tx),
      tx => appendTransactionMessageInstructions(instructions, tx),
    );
    console.log('Transaction message created:');

    // Estimating Compute Unit Limit and Prioritization Fee
    // const getComputeUnitEstimateForTransactionMessage =
    // getComputeUnitEstimateForTransactionMessageFactory({
    //   rpc
    // });
    // const computeUnitEstimate = await getComputeUnitEstimateForTransactionMessage(transactionMessage) + 100_000;
    // const medianPrioritizationFee = await rpc.getRecentPrioritizationFees()
    //   .send()
    //   .then(fees =>
    //     fees
    //       .map(fee => Number(fee.prioritizationFee))
    //       .sort((a, b) => a - b)
    //       [Math.floor(fees.length / 2)]
    //   );
    const transactionMessageWithComputeUnitInstructions = await prependTransactionMessageInstructions([
      // getSetComputeUnitLimitInstruction({ units: computeUnitEstimate }),
      // getSetComputeUnitPriceInstruction({ microLamports: medianPrioritizationFee })
      getSetComputeUnitLimitInstruction({ units: 800_000 }), 
      getSetComputeUnitPriceInstruction({ microLamports: 1 }),
    ], transactionMessage);

    // Sign and Submit Transaction
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessageWithComputeUnitInstructions)
    const base64EncodedWireTransaction = getBase64EncodedWireTransaction(signedTransaction);

    const timeoutMs = 90000;
    const startTime = Date.now();

    // 트랜잭션은 딱 한 번만 전송
    console.log('Sending transaction:');
    const signature = await rpc.sendTransaction(base64EncodedWireTransaction, {
      maxRetries: 0n,
      skipPreflight: true,
      encoding: 'base64'
    }).send();

    while (Date.now() - startTime < timeoutMs) {
      const statuses = await rpc.getSignatureStatuses([signature]).send();
      const status = statuses.value[0];

      // 상태 정보가 있으면 트랜잭션 성공/실패 여부 확인
      if (status) {
        if (!status.err) {
          console.log(`Transaction confirmed: ${signature}`);
          return;
        } else {
          console.error(`Transaction failed: ${status.err.toString()}`);
          return;
        }
      }

      // 아직 상태 정보가 없으면 1초 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // 타임아웃 경과 시 처리
    console.error(`Transaction not confirmed within ${timeoutMs}ms: ${signature}`);

  }
}
