import { Module } from '@nestjs/common';
import { ServicesBookingModule } from './services/services_booking.module';
import { VoucherModule } from './voucher/voucher.module';
import { EmployeeModule } from './employee/employee.module';
import { ReviewModule } from './review/review.module';
import { BookingModule } from './booking/booking.module';

@Module({
    imports: [ServicesBookingModule, VoucherModule, EmployeeModule, ReviewModule, BookingModule],
})
export class FeaturesModule {}
