import { Body, Controller, Get, Injectable, Post } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserCreateRequest } from "./dto/user-create.request";

@Controller("/api/user")
export class UserController {

    constructor(private readonly userService: UserService) {} 

    @Post()
    async createUser(@Body() request: UserCreateRequest) {
        return this.userService.createUser(request);
    }

}