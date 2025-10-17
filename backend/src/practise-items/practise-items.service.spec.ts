import { Test, TestingModule } from '@nestjs/testing';
import { PractiseItemsService } from './practise-items.service';

describe('PractiseItemsService', () => {
  let service: PractiseItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PractiseItemsService],
    }).compile();

    service = module.get<PractiseItemsService>(PractiseItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
