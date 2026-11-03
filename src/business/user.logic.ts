import { Injectable } from '@nestjs/common';
import { User, UserId } from './user.model';
import { UserLogicI, UserRepositoryI } from './user.ports';

@Injectable()
export class UserLogic implements UserLogicI {
  constructor(private readonly userRepository: UserRepositoryI) {}

  async create(user: User): Promise<UserId> {
    return await this.userRepository.save(user);
  }
}
