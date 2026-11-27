import {
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  PURCHASE_TYPES,
  REQUEST_STATUSES,
  type PurchaseType,
  type RequestStatus,
} from '../../business/purchase-request.model';
import {
  COMPONENT_LEADER_STATUSES,
  type ComponentLeaderStatus,
} from '../../business/request-component.model';
import {
  STATUS_GROUPS,
  SUFFICIENCY_DECISIONS,
  type LeaderDecision,
  type StatusGroup,
  type SufficiencyDecision,
} from '../../business/purchase-request.ports';

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

  // Etapa (pestaña): qué estados incluye cada una lo define el backend.
  @IsOptional()
  @IsIn(STATUS_GROUPS, {
    message:
      'statusGroup debe ser uno de: por_validar, en_proceso, aprobadas, rechazadas.',
  })
  statusGroup?: StatusGroup;

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

// La justificación es obligatoria al rechazar; esa regla la valida el dominio.
export class LeaderDecisionDto {
  @IsIn(['APROBADO', 'RECHAZADO'], {
    message: 'decision debe ser APROBADO o RECHAZADO.',
  })
  decision: LeaderDecision;

  @IsOptional()
  @IsString({ message: 'justification debe ser texto.' })
  @MaxLength(2000, {
    message: 'justification no puede exceder 2000 caracteres.',
  })
  justification?: string;
}

export class SufficiencyDecisionDto {
  @IsIn(SUFFICIENCY_DECISIONS, {
    message: 'decision debe ser AUTORIZA o RECHAZA.',
  })
  decision: SufficiencyDecision;

  @IsOptional()
  @IsString({ message: 'justification debe ser texto.' })
  @MaxLength(2000, {
    message: 'justification no puede exceder 2000 caracteres.',
  })
  justification?: string;
}

export class ResourcesInboxQueryDto extends InboxQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'unclassified debe ser true o false.' })
  unclassified?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray({ message: 'purchaseTypes debe ser un arreglo.' })
  @IsIn(PURCHASE_TYPES, {
    each: true,
    message: 'purchaseTypes contiene un tipo de compra inválido.',
  })
  purchaseTypes?: PurchaseType[];
}

export class AssignPurchaseTypeDto {
  @IsIn(PURCHASE_TYPES, {
    message: 'purchaseType debe ser una modalidad válida.',
  })
  purchaseType: PurchaseType;
}

export class SegmentAllocationDto {
  @IsUUID('all', {
    message: 'requestComponentId debe ser un UUID válido.',
  })
  requestComponentId: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'originalEstimatedAmount debe tener máximo 2 decimales.' },
  )
  @Min(0, { message: 'originalEstimatedAmount debe ser mayor o igual a 0.' })
  originalEstimatedAmount: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'derivedEstimatedAmount debe tener máximo 2 decimales.' },
  )
  @Min(0, { message: 'derivedEstimatedAmount debe ser mayor o igual a 0.' })
  derivedEstimatedAmount: number;
}

export class SegmentPurchaseRequestDto {
  @IsArray({ message: 'productItemIds debe ser un arreglo.' })
  @ArrayMinSize(1, { message: 'Debes seleccionar al menos un renglón.' })
  @ArrayUnique({ message: 'No se permiten renglones duplicados.' })
  @IsUUID('all', {
    each: true,
    message: 'Cada productItemId debe ser un UUID válido.',
  })
  productItemIds: string[];

  @IsOptional()
  @IsArray({ message: 'componentAllocations debe ser un arreglo.' })
  @ValidateNested({ each: true })
  @Type(() => SegmentAllocationDto)
  componentAllocations?: SegmentAllocationDto[];
}

export class SaveCounterPurchaseDto {
  @IsInt({ message: 'awardedProviderId debe ser un número entero.' })
  @Min(1, { message: 'awardedProviderId debe ser al menos 1.' })
  awardedProviderId: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'totalAmountFinal debe tener máximo 2 decimales.' },
  )
  @Min(0.01, { message: 'totalAmountFinal debe ser mayor a 0.' })
  totalAmountFinal: number;
}

export class ComponentFinalAmountDto {
  @IsUUID('all', {
    message: 'requestComponentId debe ser un UUID válido.',
  })
  requestComponentId: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'finalAmount debe tener máximo 2 decimales.' },
  )
  @Min(0, { message: 'finalAmount debe ser mayor o igual a 0.' })
  finalAmount: number;
}

export class SendToSufficiencyDto {
  @IsOptional()
  @IsArray({ message: 'componentFinalAmounts debe ser un arreglo.' })
  @ValidateNested({ each: true })
  @Type(() => ComponentFinalAmountDto)
  componentFinalAmounts?: ComponentFinalAmountDto[];
}
