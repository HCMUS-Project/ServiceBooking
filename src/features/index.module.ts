import { Module } from '@nestjs/common';
import { ServicesBookingModule } from './services/services_booking.module';
import { VoucherModule } from './voucher/voucher.module';
import { EmployeeModule } from './employee/employee.module';
import { ReviewModule } from './review/review.module';

@Module({
    imports: [ServicesBookingModule, VoucherModule, EmployeeModule, ReviewModule],
})
export class FeaturesModule {}
