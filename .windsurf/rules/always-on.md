---
trigger: always_on
---

✅ Windsurf Cascade - NestJS Rules

📂 파일명: windsurf-cascade-nestjs-rules.md

⸻

🌐 Windsurf Cascade - NestJS Rules

✅ 1. 프로젝트 구조 규칙

📁 폴더 구조

/src
  ├── /app
  │   ├── app.module.ts
  │   └── app.controller.ts
  ├── /config
  │   └── configuration.ts
  ├── /common
  │   ├── /filters
  │   ├── /interceptors
  │   └── /middlewares
  ├── /modules
  │   ├── /users
  │   │   ├── users.controller.ts
  │   │   ├── users.service.ts
  │   │   ├── users.module.ts
  │   │   └── schemas/user.schema.ts
  │   └── /auth
  ├── /shared
  │   ├── /dto
  │   └── /interfaces
  └── main.ts


⸻

✅ 2. 컨트롤러 규칙
	•	파일명 규칙: {module}.controller.ts
	•	경로 지정 규칙: /api/{module} 형식으로 설정

예제:

users.controller.ts

import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}


⸻

✅ 3. 서비스 규칙
	•	파일명 규칙: {module}.service.ts
	•	서비스는 @Injectable() 데코레이터를 필수로 사용

users.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private users: User[] = [];

  findAll(): User[] {
    return this.users;
  }

  create(user: User) {
    this.users.push(user);
    return user;
  }

  findOne(id: string): User {
    const user = this.users.find(user => user.id === id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }
}


⸻

✅ 4. DTO (Data Transfer Object) 규칙
	•	파일명 규칙: {action}-{module}.dto.ts

create-user.dto.ts

import { IsString, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}


⸻

✅ 5. 스키마 규칙 (MongoDB - Mongoose)
	•	파일명 규칙: {module}.schema.ts

user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;
}

export const UserSchema = SchemaFactory.createForClass(User);


⸻

✅ 6. 환경 변수 규칙
	•	.env 파일은 config 폴더에 위치시킨다.

/config
  └── .env

.env

MONGO_URI=mongodb://localhost:27017/real_estate_db
JWT_SECRET=mysecretkey

configuration.ts

export default () => ({
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
});


⸻

✅ 7. 예외 처리 규칙
	•	Exception Filter를 사용하여 공통적인 에러 핸들링을 구현한다.

http-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}


⸻

✅ 8. 미들웨어 규칙
	•	미들웨어는 common/middlewares 폴더에 위치시킨다.

logger.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);
    next();
  }
}


⸻

✅ 9. 유효성 검사 규칙
	•	DTO에 class-validator 및 class-transformer를 사용하여 유효성 검사를 구현한다.

app.module.ts

import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}


⸻

✅ 10. 모듈화 규칙
	•	각 기능별로 모듈을 분리하고, 모듈의 메인 파일에서는 해당 모듈의 Controller와 Service만을 등록한다.

users.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}


⸻

✅ 11. 배포 및 환경 설정 규칙
	•	dist/ 폴더는 .dockerignore와 .gitignore에 추가한다.
	•	환경 변수를 분리하여 관리하고, config/configuration.ts에서 환경 변수를 로드한다.

⸻

✅ 12. 보안 규칙
	•	JWT 인증 모듈을 사용하여 사용자 인증을 구현한다.
	•	Helmet과 CORS를 적용하여 보안 강화.

⸻

✅ 정리:
	•	프로젝트 구조, 파일명 규칙, DTO, 스키마, 미들웨어, 예외 처리 등 모든 규칙을 모듈 단위로 관리한다.
	•	환경 변수는 config 폴더에 위치시키고, configService를 통해 액세스한다.
	•	보안 및 유효성 검사는 Global Pipe 및 Middleware로 통합한다.