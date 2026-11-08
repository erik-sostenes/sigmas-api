import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInvitationDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(80, {
    message: 'El nombre no puede exceder los 80 caracteres',
  })
  firstName: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(80, {
    message: 'El apellido no puede exceder los 80 caracteres',
  })
  lastName: string;

  @Type(() => Number)
  @IsInt({ message: 'El ID del departamento debe ser un número entero' })
  @Min(1, { message: 'El ID del departamento debe ser mayor o igual a 1' })
  departmentId: number;

  @IsString({ message: 'El título o puesto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título o puesto es obligatorio' })
  @MaxLength(30, {
    message: 'El título o puesto no puede exceder los 30 caracteres',
  })
  title: string;

  @IsOptional()
  @IsArray({ message: 'roleIds debe ser un arreglo de números' })
  @ArrayNotEmpty({ message: 'Debes seleccionar al menos un rol' })
  @ArrayUnique({ message: 'No se permiten IDs de rol duplicados' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Cada ID de rol debe ser un número entero' })
  @Min(1, { each: true, message: 'Cada ID de rol debe ser mayor o igual a 1' })
  roleIds?: number[];

  @IsOptional()
  @IsArray({ message: 'roleCodes debe ser un arreglo de códigos de rol' })
  @ArrayNotEmpty({ message: 'Debes seleccionar al menos un rol' })
  @ArrayUnique({ message: 'No se permiten códigos de rol duplicados' })
  @IsString({ each: true, message: 'Cada código de rol debe ser texto' })
  @Matches(/^[a-z0-9_]+$/, {
    each: true,
    message:
      'Cada código de rol debe estar en minúsculas y usar solo letras, números o guion bajo',
  })
  roleCodes?: string[];

  @IsOptional()
  @IsArray({
    message: 'activityIds debe ser un arreglo de IDs de actividad',
  })
  @ArrayUnique({ message: 'No se permiten IDs de actividad duplicados' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Cada ID de actividad debe ser un número entero' })
  @Min(1, { each: true, message: 'Cada ID de actividad debe ser mayor o igual a 1' })
  activityIds?: number[];

  @IsOptional()
  @IsArray({
    message: 'activityCodes debe ser un arreglo de códigos de actividad',
  })
  @ArrayUnique({ message: 'No se permiten códigos de actividad duplicados' })
  @IsString({ each: true, message: 'Cada código de actividad debe ser texto' })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    each: true,
    message: 'Cada código de actividad tiene un formato inválido',
  })
  activityCodes?: string[];
}
