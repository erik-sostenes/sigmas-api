import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
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

  @IsArray({ message: 'isos debe ser un arreglo de cadenas de texto' })
  @ArrayNotEmpty({ message: 'Debes incluir al menos una norma ISO' })
  @ArrayUnique({ message: 'No se permiten normas ISO duplicadas' })
  @IsString({ each: true, message: 'Cada código ISO debe ser una cadena de texto' })
  isos: string[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmountEstimated?: number;
}
