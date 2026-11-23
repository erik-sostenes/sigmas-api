import {
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  REQUEST_STATUSES,
  type RequestStatus,
} from '../../business/purchase-request.model';
import {
  COMPONENT_LEADER_STATUSES,
  type ComponentLeaderStatus,
} from '../../business/request-component.model';

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

// requestedBy no viene en el body: el backend lo toma del token.
export class CreatePurchaseRequestDto {
  @IsString({ message: 'La justificación debe ser texto.' })
  @IsNotEmpty({ message: 'La justificación es obligatoria.' })
  justification: string;

  @IsArray({ message: 'isoIds debe ser un arreglo de números' })
  @ArrayNotEmpty({ message: 'Debes incluir al menos una norma ISO' })
  @ArrayUnique({ message: 'No se permiten normas ISO duplicadas' })
  @IsInt({ each: true, message: 'Cada ID de ISO debe ser un número entero' })
  @Min(1, { each: true, message: 'Cada ID de ISO debe ser mayor a 0' })
  isoIds: number[];

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

// Filtros de las bandejas. Solo reducen lo que la bandeja ya permite ver.
export class InboxQueryDto {
  @IsOptional()
  @IsIn(REQUEST_STATUSES, {
    message: 'status no es un estatus válido.',
  })
  status?: RequestStatus;

  @IsOptional()
  @IsString({ message: 'search debe ser texto.' })
  @MaxLength(20, { message: 'search no puede exceder 20 caracteres.' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero.' })
  @Min(1, { message: 'page debe ser al menos 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero.' })
  @Min(1, { message: 'limit debe ser al menos 1.' })
  @Max(100, { message: 'limit no puede ser mayor a 100.' })
  limit?: number = 10;
}

export class LeaderInboxQueryDto extends InboxQueryDto {
  // Estado de las filas del líder. Con status=SOLICITADO da sus pendientes por decidir.
  @IsOptional()
  @IsIn(COMPONENT_LEADER_STATUSES, {
    message: 'leaderStatus debe ser uno de: PENDIENTE, APROBADO, RECHAZADO.',
  })
  leaderStatus?: ComponentLeaderStatus;
}
