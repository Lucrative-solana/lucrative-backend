import { Module } from '@nestjs/common';
import { PurchaseModule } from './purchase/purchase.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SearchService } from './search/search.service';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot(
      {
        isGlobal: true,
        envFilePath: '.env',
      }),
    PurchaseModule, PrismaModule, SearchModule],
  controllers: [AppController],
  providers: [AppService, SearchService],
})
export class AppModule {}