import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';

@Module({
  controllers: [SellerController], // SellerController 추가
  providers: [SellerService],
  exports: [SellerService],
})
export class SellerModule {}