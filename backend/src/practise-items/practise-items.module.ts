import { Module } from '@nestjs/common';
import { PractiseItemsController } from './practise-items.controller';

@Module({
  controllers: [PractiseItemsController]
})
export class PractiseItemsModule {}
