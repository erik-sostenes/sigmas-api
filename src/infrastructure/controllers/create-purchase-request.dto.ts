import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PURCHASE_TYPES,
  type PurchaseType,
} from '../../business/purchase-request.model';

export class CreatePurchaseRequestDto {
  @IsString()
  @Length(36, 36)
  requestedBy: string;

  @IsIn(PURCHASE_TYPES)
  purchaseType: PurchaseType;

  @IsString()
  @IsNotEmpty()
  justification: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  iso: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmountEstimated?: number;
}
