import { SearchService } from './search.service';
import { Body, Controller, Get, Post } from '@nestjs/common';

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

  @Get('/all')
  async getAll() {
    return {
      message: 'Hello Search!',
    };
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
