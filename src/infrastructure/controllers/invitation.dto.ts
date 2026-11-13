import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class CreateInvitationDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsInt()
  @Min(1)
  departmentId: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  componentId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  title: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un rol.' })
  @IsInt({ each: true })
  roleIds: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  activityIds?: number[];
}
