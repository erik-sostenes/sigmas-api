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

  @IsArray({ message: 'roleCodes debe ser un arreglo de códigos de rol' })
  @ArrayNotEmpty({ message: 'Debes seleccionar al menos un rol' })
  @ArrayUnique({ message: 'No se permiten códigos de rol duplicados' })
  @IsString({ each: true, message: 'Cada código de rol debe ser texto' })
  @Matches(/^[a-z0-9_]+$/, {
    each: true,
    message:
      'Cada código de rol debe estar en minúsculas y usar solo letras, números o guion bajo',
  })
  roleCodes: string[];

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
