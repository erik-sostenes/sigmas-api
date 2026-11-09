import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRequestComponentDto {
  @IsInt({
    message: 'requestComponents.componentId debe ser un número entero.',
  })
  @Min(1, { message: 'requestComponents.componentId debe ser al menos 1.' })
  componentId: number;

  @IsInt({ message: 'requestComponents.activityId debe ser un número entero.' })
  @Min(1, { message: 'requestComponents.activityId debe ser al menos 1.' })
  activityId: number;

  @IsInt({
    message: 'requestComponents.fundingSourceId debe ser un número entero.',
  })
  @Min(1, { message: 'requestComponents.fundingSourceId debe ser al menos 1.' })
  fundingSourceId: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'requestComponents.estimatedAmount debe tener máximo 2 decimales.',
    },
  )
  @Min(0, {
    message: 'requestComponents.estimatedAmount debe ser mayor o igual a 0.',
  })
  estimatedAmount: number;
}

export class CreateProductItemDto {
  @IsInt({ message: 'productItems.budgetItemId debe ser un número entero.' })
  @Min(1, { message: 'productItems.budgetItemId debe ser al menos 1.' })
  budgetItemId: number;

  @IsInt({
    message: 'productItems.measurementUnitId debe ser un número entero.',
  })
  @Min(1, { message: 'productItems.measurementUnitId debe ser al menos 1.' })
  measurementUnitId: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'productItems.quantity debe tener máximo 2 decimales.' },
  )
  @Min(0.01, { message: 'productItems.quantity debe ser mayor a 0.' })
  quantity: number;

  @IsString({ message: 'productItems.description debe ser texto.' })
  @IsNotEmpty({ message: 'productItems.description es obligatorio.' })
  @MaxLength(500, {
    message: 'productItems.description no puede exceder 500 caracteres.',
  })
  description: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'productItems.estimatedAmount debe tener máximo 2 decimales.' },
  )
  @Min(0.01, { message: 'productItems.estimatedAmount debe ser mayor a 0.' })
  estimatedAmount: number;
}

export class CreatePurchaseRequestDto {
  @IsUUID('4', {
    message: 'El identificador del solicitante no es un UUID v4 válido.',
  })
  requestedBy: string;

  @IsString({ message: 'La justificación debe ser texto.' })
  @IsNotEmpty({ message: 'La justificación es obligatoria.' })
  justification: string;

  @IsInt({ message: 'isoId debe ser un número entero.' })
  @Min(1, { message: 'isoId debe ser al menos 1.' })
  isoId: number;

  @IsArray({ message: 'requestComponents debe ser un arreglo.' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un componente.' })
  @ValidateNested({ each: true })
  @Type(() => CreateRequestComponentDto)
  requestComponents: CreateRequestComponentDto[];

  @IsArray({ message: 'productItems debe ser un arreglo.' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un producto.' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductItemDto)
  productItems: CreateProductItemDto[];
}
