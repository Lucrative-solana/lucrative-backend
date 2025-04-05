import { Module } from '@nestjs/common';
import { PurchaseModule } from './purchase/purchase.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(
      {
        isGlobal: true,
        envFilePath: '.env',
      }),
    PurchaseModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}