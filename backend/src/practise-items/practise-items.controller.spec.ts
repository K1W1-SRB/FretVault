import { Test, TestingModule } from '@nestjs/testing';
import { PractiseItemsController } from './practise-items.controller';

describe('PractiseItemsController', () => {
  let controller: PractiseItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PractiseItemsController],
    }).compile();

    controller = module.get<PractiseItemsController>(PractiseItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
