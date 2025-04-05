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
    itemId: string;
    itemName: string;
    itemDescription: string;
  }) {
    console.log('Received purchase request:', body);
    return this.purchaseService.process(body.buyer, body.seller, body.amountInSol, body.itemId, body.itemName, body.itemDescription);
  }
}