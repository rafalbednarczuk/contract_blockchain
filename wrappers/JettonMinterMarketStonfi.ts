import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
    internal as internal_relaxed,
    storeMessageRelaxed
} from '@ton/core';

import {Op} from './JettonConstants';
import {
    JettonMinterMakerConfig,
    JettonMinterMakerConfigToCell,
    JettonMinterMakerContent,
    JettonMinterMarket
} from "./JettonMinterMarket";


export type JettonMinterMakerStonfiConfig = {
    admin: Address;
    content: Cell;
    wallet_code: Cell,
    router_address: Address,
    router_pton_wallet_address: Address
};

export function JettonMinterMakerStonfiConfigToCell(config: JettonMinterMakerStonfiConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.admin)
        .storeRef(config.content)
        .storeRef(config.wallet_code)
        .storeUint(0, 1)
        .storeAddress(config.router_address)
        .storeAddress(config.router_pton_wallet_address)
        .endCell();
}

export function jettonContentToCell(content: JettonMinterMakerContent) {
    return beginCell()
        .storeUint(content.type, 8)
        .storeStringTail(content.uri) //Snake logic under the hood
        .endCell();
}

export class JettonMinterMarketStonfi extends JettonMinterMarket implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
        super(address, init);

    }

    static createFromConfig(config: JettonMinterMakerStonfiConfig, code: Cell, workchain = 0) {
        const data = JettonMinterMakerStonfiConfigToCell(config);
        const init = {code, data};
        return new JettonMinterMarketStonfi(contractAddress(workchain, init), init);
    }

    async getRealSupply(provider: ContractProvider) {
        let res = await provider.get('get_contract_storage', []);
        return res.stack.readBigNumber();
    }

    async getTonBalance(provider: ContractProvider) {
        let res = await provider.get('get_ton_balance', []);
        return res.stack.readBigNumber();
    }

}
