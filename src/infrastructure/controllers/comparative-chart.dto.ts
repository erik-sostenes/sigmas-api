import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EVALUATION_CRITERIA,
  type EvaluationCriterion,
} from '../../business/comparative-chart.model';
import {
  REQUEST_STATUSES,
  type RequestStatus,
} from '../../business/purchase-request.model';
import { STATUS_GROUPS, type StatusGroup } from '../../business/purchase-request.ports';

export class ListComparativeChartsQueryDto {
  @IsOptional()
  @IsIn(REQUEST_STATUSES, { message: 'status no es un estatus válido.' })
  status?: RequestStatus;

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

export class ChartItemDto {
  @IsUUID('all', { message: 'productItemId debe ser un UUID válido.' })
  productItemId: string;

  @ValidateIf((o: ChartItemDto) => o.unitCost !== null)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'unitCost debe tener máximo 2 decimales.' },
  )
  @Min(0, { message: 'unitCost debe ser mayor o igual a 0.' })
  unitCost: number | null;
}

export class ChartEvaluationDto {
  @IsIn(EVALUATION_CRITERIA, { message: 'criterion no es válido.' })
  criterion: EvaluationCriterion;

  @IsInt({ message: 'score debe ser un número entero.' })
  @Min(0, { message: 'score mínimo es 0.' })
  @Max(9, { message: 'score máximo es 9.' })
  score: number;

  @IsString({ message: 'observation debe ser texto.' })
  @IsNotEmpty({ message: 'observation es obligatoria.' })
  @MaxLength(500, {
    message: 'observation no puede exceder 500 caracteres.',
  })
  observation: string;
}

export class ChartColumnDto {
  @IsInt({ message: 'providerId debe ser un entero positivo.' })
  @Min(1, { message: 'providerId debe ser al menos 1.' })
  providerId: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'iva debe tener máximo 2 decimales.' },
  )
  @Min(0, { message: 'iva debe ser mayor o igual a 0.' })
  iva: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'retentionIva debe tener máximo 2 decimales.' },
  )
  @Min(0, { message: 'retentionIva debe ser mayor o igual a 0.' })
  retentionIva?: number = 0;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'retentionIsr debe tener máximo 2 decimales.' },
  )
  @Min(0, { message: 'retentionIsr debe ser mayor o igual a 0.' })
  retentionIsr?: number = 0;

  @IsArray({ message: 'items debe ser un arreglo.' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos 1 artículo.' })
  @ValidateNested({ each: true })
  @Type(() => ChartItemDto)
  items: ChartItemDto[];

  @IsArray({ message: 'evaluations debe ser un arreglo.' })
  @ArrayMinSize(5, { message: 'Debe incluir los 5 criterios de evaluación.' })
  @ArrayMaxSize(5, { message: 'Debe incluir exactamente 5 criterios.' })
  @ValidateNested({ each: true })
  @Type(() => ChartEvaluationDto)
  evaluations: ChartEvaluationDto[];
}

export class UpdateComparativeChartDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'chartDate debe tener formato YYYY-MM-DD.',
  })
  chartDate?: string;

  @IsOptional()
  @ValidateIf((o: UpdateComparativeChartDto) => o.awardedJustification !== null)
  @IsString({ message: 'awardedJustification debe ser texto.' })
  @MaxLength(2000, {
    message: 'awardedJustification no puede exceder 2000 caracteres.',
  })
  awardedJustification?: string | null;

  @IsOptional()
  @ValidateIf((o: UpdateComparativeChartDto) => o.deliveryDate !== null)
  @IsDateString({}, { message: 'deliveryDate debe ser una fecha válida YYYY-MM-DD.' })
  deliveryDate?: string | null;

  @IsArray({ message: 'columns debe ser un arreglo.' })
  @ArrayMinSize(3, { message: 'Debe incluir exactamente 3 proveedores.' })
  @ArrayMaxSize(3, { message: 'Debe incluir exactamente 3 proveedores.' })
  @ValidateNested({ each: true })
  @Type(() => ChartColumnDto)
  columns: ChartColumnDto[];
}

export class CreateComparativeChartDto extends UpdateComparativeChartDto {
  @IsUUID('all', { message: 'purchaseRequestId debe ser un UUID válido.' })
  purchaseRequestId: string;
}
