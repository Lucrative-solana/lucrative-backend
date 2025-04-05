import { IsString, IsNumber, IsUUID, Min, Max } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  walletAddress: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  discountRate: number;

  @IsNumber()
  @Min(0)
  quantity: number;
}
