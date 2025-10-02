import { Module } from '@nestjs/common';
import { TabsController } from './tabs.controller';

@Module({
  controllers: [TabsController]
})
export class TabsModule {}
