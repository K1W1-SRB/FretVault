import { Test } from '@nestjs/testing';
import { WorkspacesController } from './workspace.controller';

describe('WorkspaceController', () => {
  let controller: WorkspacesController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [WorkspacesController],
    }).compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
