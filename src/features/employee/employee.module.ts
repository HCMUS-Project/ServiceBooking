import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { SupabaseService } from 'src/util/supabase/supabase.service';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';

@Module({
    imports: [PrismaModule],
    controllers: [EmployeeController],
    providers: [EmployeeService],
})
export class EmployeeModule {}
