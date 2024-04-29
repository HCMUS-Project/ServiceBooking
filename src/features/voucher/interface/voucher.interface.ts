import {
    CreateVoucherRequest,
    CreateVoucherResponse,
    DeleteVoucherRequest,
    DeleteVoucherResponse,
    EditVoucherRequest,
    EditVoucherResponse,
    FindAllVouchersRequest,
    FindAllVouchersResponse,
    FindOneVoucherRequest,
    FindOneVoucherResponse,
    Voucher,
} from 'src/proto_build/voucher/voucher_pb';

export interface IVoucher extends Voucher.AsObject {}

export interface ICreateVoucherRequest extends CreateVoucherRequest.AsObject {}
export interface ICreateVoucherResponse extends CreateVoucherResponse.AsObject {}

export interface IFindOneVoucherRequest extends FindOneVoucherRequest.AsObject {}
export interface IFindOneVoucherResponse extends FindOneVoucherResponse.AsObject {}

export interface IFindAllVouchersRequest extends FindAllVouchersRequest.AsObject {}
export interface IFindAllVouchersResponse
    extends Omit<FindAllVouchersResponse.AsObject, 'vouchersList'> {
    vouchers: FindAllVouchersResponse.AsObject[];
}

export interface IEditVoucherRequest extends EditVoucherRequest.AsObject {}
export interface IEditVoucherResponse extends EditVoucherResponse.AsObject {}

export interface IDeleteVoucherRequest extends DeleteVoucherRequest.AsObject {}
export interface IDeleteVoucherResponse extends DeleteVoucherResponse.AsObject {}
