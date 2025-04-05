import { SearchService } from './search.service';
import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // Define your search-related endpoints here
  // For example:
  // @Get('items')
  // async searchItems(@Query('query') query: string) {
  //   return this.searchService.searchItems(query);
  // }
  @Get()
  getHello() {
    return 'Hello Search!';
  }

  @Get('/allitem')
  async getAll() {
    return await this.searchService.search_all_item();
  }

  @Get('/item-by-id')
  async getItemById(@Query('id') id: string) {
    console.log('Received item by ID request:', id);
    if (!id) {
      throw new BadRequestException('ID is required');
    }
    return await this.searchService.search_item_by_id(id);
  }

  @Post('/my-register-item')
  async registerItem(@Body() body: { WalletAddress: string }) {
    console.log('Received register item request:', body);
    await this.searchService.search_my_register_item(body.WalletAddress);
    return {
      message: 'Search completed successfully',
      data: await this.searchService.search_my_register_item(
        body.WalletAddress,
      ),
    };
  }
}
