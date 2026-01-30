import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkspacesService } from './workspace.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/auth/user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get('me')
  listMine(@User('id') userId: number) {
    return this.workspaces.listMine(userId);
  }

  @Post()
  create(@User('id') userId: number, @Body() dto: CreateWorkspaceDto) {
    if (!dto) throw new BadRequestException('Missing request body');
    if (!dto.type) throw new BadRequestException('Missing workspace type');
    return this.workspaces.createWorkspace(userId, dto);
  }

  @Get(':workspaceId')
  getOne(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspaces.getWorkspace(workspaceId, userId);
  }

  @Post(':workspaceId/members')
  addMember(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaces.addMember(workspaceId, userId, dto);
  }

  @Delete(':workspaceId/members/:userId')
  removeMember(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') memberId: string,
  ) {
    return this.workspaces.removeMember(workspaceId, userId, Number(memberId));
  }
}
