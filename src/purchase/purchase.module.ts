import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { SellerModule } from 'src/seller/seller.module';

@Module({
  imports: [SellerModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}