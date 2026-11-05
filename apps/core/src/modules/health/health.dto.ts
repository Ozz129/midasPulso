import { ApiProperty } from '@nestjs/swagger';

export class HealthOkDto {
  @ApiProperty({ example: 'ok', enum: ['ok'] })
  status: 'ok';
}

export class HealthUnavailableDto {
  @ApiProperty({ example: 'unavailable', enum: ['unavailable'] })
  status: 'unavailable';
}
