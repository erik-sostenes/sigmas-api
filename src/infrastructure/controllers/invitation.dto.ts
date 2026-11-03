import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInvitationDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty()
  email: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  title: string;
}
