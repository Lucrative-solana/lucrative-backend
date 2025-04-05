import { Controller, Get, Post, Body } from '@nestjs/common';
import { PurchaseService } from './purchase.service';

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get('receiver')
  getReceiverAddress() {
    return this.purchaseService.getReceiverAddress();
  }

  @Post()
  async handlePurchase(@Body() body: {
    buyer: string;
    seller: string;
    amountInSol: number;
  }) {
    console.log('Received purchase request:', body);
    console.log('Buyer:', body.buyer);
    console.log('Seller:', body.seller);
    console.log('Amount in SOL:', body.amountInSol);
    return this.purchaseService.process(body.buyer, body.seller, body.amountInSol);
  }
}