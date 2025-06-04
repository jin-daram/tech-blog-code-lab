import { Injectable } from "@nestjs/common";
import { UserRepository } from "./user.repository";
import { Transactional } from "src/common/decorators/transactional.decorator";
import { UserCreateRequest } from "./dto/user-create.request";

@Injectable()
export class UserService {

    constructor(
        private readonly userRepository: UserRepository
    ) {}

    @Transactional()
    async createUser(userCreateRequest: UserCreateRequest): Promise<void> {
        await this.userRepository.save(userCreateRequest);
    }

}
