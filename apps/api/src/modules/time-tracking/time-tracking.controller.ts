import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeEntryDto, StartTimerDto, UpdateTimeEntryDto, TimeEntryQuery } from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller({ path: 'time-entries', version: '1' })
export class TimeTrackingController {
  constructor(private readonly svc: TimeTrackingService) {}

  @Get()
  @RequirePermissions('time_entry:read')
  findAll(@CurrentUser() u: AuthPrincipal, @Query() query: TimeEntryQuery) {
    return this.svc.findAll(u, query);
  }

  @Get(':id')
  @RequirePermissions('time_entry:read')
  findOne(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(u, id);
  }

  @Post()
  @RequirePermissions('time_entry:create')
  create(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateTimeEntryDto) {
    return this.svc.create(u, dto);
  }

  @Post('start')
  @RequirePermissions('time_entry:create')
  start(@CurrentUser() u: AuthPrincipal, @Body() dto: StartTimerDto) {
    return this.svc.startTimer(u, dto);
  }

  @Post(':id/stop')
  @RequirePermissions('time_entry:update')
  stop(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.stopTimer(u, id);
  }

  @Patch(':id')
  @RequirePermissions('time_entry:update')
  update(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeEntryDto,
  ) {
    return this.svc.update(u, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('time_entry:delete')
  remove(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version', ParseIntPipe) version: number,
  ) {
    return this.svc.remove(u, id, version);
  }
}
