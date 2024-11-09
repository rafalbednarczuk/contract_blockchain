export abstract class Op {
    static transfer = 0xf8a7ea5;
    static transfer_notification = 0x7362d09c;
    static internal_transfer = 0x178d4519;
    static excesses = 0xd53276db;
    static burn = 0x595f07bc;
    static burn_notification = 0x7bdd97de;
    static buy_coins = 0x23bafc01;
    static withdraw_fees = 0x1f7eabd8;

    static provide_wallet_address = 0x2c76b973;
    static take_wallet_address = 0xd1735400;
    static mint = 21;
    static change_admin = 3;
    static change_content = 4;
}

export abstract class Errors {
    static invalid_op = 709;
    static not_admin  = 73;
    static unouthorized_burn = 74;
    static discovery_fee_not_matched = 75;
    static wrong_op = 0xffff;
    static not_owner = 705;
    static not_enough_ton = 709;
    static not_enough_gas = 707;
    static not_valid_wallet = 707;
    static wrong_workchain = 333;
    static balance_error   = 706;
}

// Define type for operation codes
export type OpCode = number;

// Operation codes mapping with proper typing
export const OpNames: Record<OpCode, string> = {
    0xf8a7ea5: 'transfer',
    0x7362d09c: 'transfer_notification',
    0x178d4519: 'internal_transfer',
    0xd53276db: 'excesses',
    0x595f07bc: 'burn',
    0x7bdd97de: 'burn_notification',
    0x23bafc01: 'buy_coins',
    0x1f7eabd8: 'withdraw_fees',
    0x2c76b973: 'provide_wallet_address',
    0xd1735400: 'take_wallet_address',
    21: 'mint',
    3: 'change_admin',
    4: 'change_content'
};