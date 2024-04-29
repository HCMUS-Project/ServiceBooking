import { Module } from '@nestjs/common';
import { ServicesBookingModule } from './services/services_booking.module';
import { VoucherModule } from './voucher/voucher.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
    imports: [ServicesBookingModule, VoucherModule, EmployeeModule],
})
export class FeaturesModule {}
