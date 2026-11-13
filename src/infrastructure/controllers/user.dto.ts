import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty()
  email: string;

  @IsInt()
  @Min(1)
  departmentId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  title: string;
}
