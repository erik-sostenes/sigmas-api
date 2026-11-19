import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { UserLogicI } from '../../business/user.ports';
import { User } from '../../business/user.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { UserExceptionFilter } from './user-exception.filter';

@Controller('api/v1/users')
@UseGuards(ClerkAuthGuard)
@UseFilters(UserExceptionFilter)
export class UserController {
  constructor(private readonly userLogic: UserLogicI) {}

  @Get()
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<User[]> {
    return await this.userLogic.getUsers();
  }

  @Post('me/sync')
  @HttpCode(HttpStatus.OK)
  async sync(@Req() req: { auth: { userId: string } }): Promise<User> {
    return await this.userLogic.syncFromClerk(req.auth.userId);
  }
}
