import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { init } from './common/init';
import { context } from './common/context';
import { DataSource } from 'typeorm';
import { User } from './user/user.entity';

context.setDataSource(new DataSource({
  type : "postgres",
  host : "DB_HOST",
  port : 5432,
  username: "DB_USERNAME",
  password : "DB_PASSWORD",
  database: "DB_DATABASE",
  entities: [User],
  logging: true, // 디버깅 목적의 logging
}))

init();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
