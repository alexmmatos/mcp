import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SwaggerProject, SwaggerProjectSchema } from '../swagger/swagger-project.schema';
import { ExecutionLogsModule } from '../execution-logs/execution-logs.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SwaggerProject.name, schema: SwaggerProjectSchema }]),
    ExecutionLogsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
