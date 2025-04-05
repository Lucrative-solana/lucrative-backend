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

  async search_all_item() {
    const seletquerydata = await this.prisma.item.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        walletAddress: true,
        discountRate: true,
        quantity: true,
      },
    });
    console.log('seletquerydata', seletquerydata);
    if (seletquerydata.length === 0) {
      console.log('No items found');
      return {
        message: 'No items found',
      };
    }
    console.log('Items found:', seletquerydata);
    return seletquerydata;
  }

  async search_item_by_id(id: string) {
    const selectquerydata = await this.prisma.item.findUnique({
      where: {
        id: id,
      },
    });
    console.log('selectquerydata', selectquerydata);
    if (!selectquerydata) {
      console.log('No item found for the given ID');
      return {
        message: 'No item found for the given ID',
      };
    }
    console.log('Item found:', selectquerydata);
    return selectquerydata;
  }
}
