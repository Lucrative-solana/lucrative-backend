import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { SellerModule } from 'src/seller/seller.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [SellerModule, PrismaModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}