import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { SellerService } from './seller.service';

@Controller('seller')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get('message')
  getLoginMessage(@Query('wallet') wallet: string) {
    if (!wallet) throw new BadRequestException('wallet is required');
    return { message: this.sellerService.generateLoginMessage(wallet) };
  }

  @Post('login')
  async login(@Body() body: { wallet: string; message: string; signature: string }) {
    const { wallet, message, signature } = body;
    if (!wallet || !message || !signature) {
      throw new BadRequestException('Missing wallet, message, or signature');
    }

    const valid = this.sellerService.verifySignature(wallet, message, signature);
    if (!valid) throw new BadRequestException('Invalid signature');

    return this.sellerService.handleLogin(wallet);
  }
}
