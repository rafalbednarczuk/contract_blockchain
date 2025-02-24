import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { Op } from './JettonConstants';

export type AicMmV2Config = {};

export function AicMmV2ConfigToCell(config: AicMmV2Config): Cell {
    return beginCell()
        .storeUint(0, 1)
        .storeCoins(0)
        .storeDict(null)
        .endCell();
}

export class AicMmV2 implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new AicMmV2(address);
    }

    static createFromConfig(config: AicMmV2Config, code: Cell, workchain = 0) {
        const data = AicMmV2ConfigToCell(config);
        const init = { code, data };
        return new AicMmV2(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell()
        });
    }

    async sendBuy(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        query_id: bigint,
        jettons_amount_requested: bigint,
        max_ton_requested: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Op.buy_coins, 32)
                .storeUint(query_id, 64)
                .storeCoins(jettons_amount_requested)
                .storeCoins(max_ton_requested)
                .endCell()
        });
    }

    async sendSell(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        query_id: bigint,
        jettons_amount_to_sell: bigint,
        min_ton_requested: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Op.sell_coins, 32)
                .storeUint(query_id, 64)
                .storeCoins(jettons_amount_to_sell)
                .storeCoins(min_ton_requested)
                .endCell()
        });
    }

    async getMemecoinsBalance(provider: ContractProvider, ownerAddress: Address) {
        let res = await provider.get('get_memecoins_balance', [{
            type: 'slice',
            cell: beginCell().storeAddress(ownerAddress).endCell()
        }]);
        return res.stack.readBigNumber();
    }

    async getTonBalance(provider: ContractProvider) {
        let res = await provider.get('get_ton_balance', []);
        return res.stack.readBigNumber();
    }

}
