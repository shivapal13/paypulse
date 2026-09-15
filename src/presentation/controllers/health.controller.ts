import { Controller, Get } from '@nestjs/common';
import { timestamp } from 'rxjs';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      service: 'paypulse-Backend-Running',
      timestamp: new Date().toISOString(),
    };
  }
}
