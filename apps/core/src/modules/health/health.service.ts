import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const DATABASE_CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Comprueba PostgreSQL con una consulta liviana y un tiempo máximo acotado. */
  async isDatabaseUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`sin respuesta en ${DATABASE_CHECK_TIMEOUT_MS} ms`)),
          DATABASE_CHECK_TIMEOUT_MS,
        );
      });
      await Promise.race([this.dataSource.query('SELECT 1'), timeout]);
      return true;
    } catch (error) {
      // Solo el mensaje: nunca la cadena de conexión ni la traza completa.
      const reason = error instanceof Error ? error.message : 'error desconocido';
      this.logger.warn(`PostgreSQL no disponible: ${reason}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
