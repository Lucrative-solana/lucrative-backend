import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search_my_register_item(query: string) {
    const selectquerydata = await this.prisma.item.findMany({
      where: {
        OR: [
          {
            walletAddress: {
              contains: query,
            },
          },
        ],
      },
    });
    console.log('selectquerydata', selectquerydata);
    if (selectquerydata.length === 0) {
      console.log('No items found for the given wallet address');
      return {
        message: 'No items found for the given wallet address',
      };
    }
    console.log('Items found:', selectquerydata);
    return selectquerydata;
  }
}
