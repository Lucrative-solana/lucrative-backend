import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { SellerService } from './seller.service';
import { CreateItemDto } from './dto/create-item.dto';

@Controller('seller')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get('message')
  getLoginMessage(@Query('wallet') wallet: string) {
    if (!wallet) throw new BadRequestException('wallet is required');
    return { message: this.sellerService.generateLoginMessage(wallet) };
  }

  @Post('items')
  async createItem(@Body() dto: CreateItemDto) {
    if (!dto.name || !dto.description || !dto.price || !dto.walletAddress || dto.discountRate < 0 || dto.quantity < 0) {
      throw new BadRequestException('Invalid item data');
    }
    return this.sellerService.createItem(dto);
  }

  @Get('items/all')
  async getItemsByWallet(@Query('walletAddress') walletAddress: string) {
    return this.sellerService.findItemsByWallet(walletAddress);
  }

  @Post('token/address')
  async login(@Body() body: { wallet: string;}) {
    console.log('Received login request:', body);
    return this.sellerService.getTokenAddress(body);
  }
}
