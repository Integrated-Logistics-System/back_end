import { Module } from '@nestjs/common';
import { CategoryUtils } from './category.utils';

@Module({
  providers: [CategoryUtils],
  exports: [CategoryUtils],
})
export class UtilsModule {}
