import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
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

  @IsArray({ message: 'isoIds debe ser un arreglo de números' })
  @ArrayNotEmpty({ message: 'Debes incluir al menos una norma ISO' })
  @ArrayUnique({ message: 'No se permiten normas ISO duplicadas' })
  @IsInt({ each: true, message: 'Cada ID de ISO debe ser un número entero' })
  @Min(1, { each: true, message: 'Cada ID de ISO debe ser mayor a 0' })
  isoIds: number[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmountEstimated?: number;
}
