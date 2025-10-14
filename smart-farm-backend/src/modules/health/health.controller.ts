import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    // Simple health check; minimize info exposure in production
    const basic = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
    } as const;

    if (process.env.NODE_ENV === 'production') {
      return basic;
    }

    return {
      ...basic,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
    };
  }

  @Get('database')
  async getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('mqtt')
  async getMqttHealth() {
    return this.healthService.getMqttHealth();
  }

  @Get('sensors')
  async getSensorsHealth() {
    return this.healthService.getSensorsHealth();
  }

  @Get('detailed')
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }
}
