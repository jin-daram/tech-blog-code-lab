import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserRepository } from "./user.repository";
import { UserController } from "./user.controller";

@Module({
    imports: [],
    controllers: [UserController],
    providers: [UserService, UserRepository],
})
export class UserModule {}