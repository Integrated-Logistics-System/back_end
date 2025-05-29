import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NaverService } from './naver.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [NaverService],
  exports: [NaverService],
})
export class NaverModule {}
