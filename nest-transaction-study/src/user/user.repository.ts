import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UserRepository extends Repository<User> {

    constructor(dataSource: DataSource) {
        // FIXME: Object.defineProperty 때문에 무시됨. 해당 생성자를 사용하지 않는 방향으로도 개선 가능할 것 같음.
        super(User, dataSource.createEntityManager()); 
    }

}