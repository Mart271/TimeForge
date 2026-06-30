import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ScrumService } from './scrum.service';
import {
  CommentScrumEntryDto,
  CreateScrumEntryDto,
  ScrumQuery,
  UpdateScrumEntryDto,
} from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller({ path: 'scrum-entries', version: '1' })
export class ScrumController {
  constructor(private readonly svc: ScrumService) {}

  @Get()
  @RequirePermissions('scrum:read')
  findAll(@CurrentUser() u: AuthPrincipal, @Query() query: ScrumQuery) {
    return this.svc.findAll(u, query);
  }

  @Get(':id')
  @RequirePermissions('scrum:read')
  findOne(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(u, id);
  }

  @Post()
  @RequirePermissions('scrum:create')
  create(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateScrumEntryDto) {
    return this.svc.create(u, dto);
  }

  @Patch(':id')
  @RequirePermissions('scrum:update')
  update(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScrumEntryDto,
  ) {
    return this.svc.update(u, id, dto);
  }

  /** Supervisor adds a comment to a team member's scrum entry. */
  @Post(':id/comment')
  @HttpCode(200)
  @RequirePermissions('scrum:read_team')
  comment(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CommentScrumEntryDto,
  ) {
    return this.svc.comment(u, id, dto);
  }
}
