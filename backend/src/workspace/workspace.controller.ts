import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkspacesService } from './workspace.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get('me')
  listMine(@Req() req: any) {
    return this.workspaces.listMine(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateWorkspaceDto) {
    if (!dto) throw new BadRequestException('Missing request body');
    if (!dto.type) throw new BadRequestException('Missing workspace type');
    return this.workspaces.createWorkspace(req.user.id, dto);
  }

  @Get(':workspaceId')
  getOne(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.getWorkspace(workspaceId, req.user.id);
  }

  @Post(':workspaceId/members')
  addMember(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaces.addMember(workspaceId, req.user.id, dto);
  }

  @Delete(':workspaceId/members/:userId')
  removeMember(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspaces.removeMember(
      workspaceId,
      req.user.id,
      Number(userId),
    );
  }
}
