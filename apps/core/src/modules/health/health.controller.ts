import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthOkDto, HealthUnavailableDto } from './health.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Estado de Pulso Core y de su conexión con PostgreSQL' })
  @ApiOkResponse({ type: HealthOkDto, description: 'API y base de datos disponibles' })
  @ApiServiceUnavailableResponse({
    type: HealthUnavailableDto,
    description: 'La API responde pero PostgreSQL no está disponible',
  })
  async check(): Promise<HealthOkDto> {
    if (await this.health.isDatabaseUp()) {
      return { status: 'ok' };
    }
    const body: HealthUnavailableDto = { status: 'unavailable' };
    throw new ServiceUnavailableException(body);
  }
}
