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


export type CoinToLaunchContent = {
    type: 0 | 1,
    uri: string
};

export type CoinLauncherConfig = {
    minter_code: Cell;
    wallet_code: Cell;
    admin_address: Address,
    router_address: Address,
    router_pton_wallet_address: Address
};

export function CoinLauncherConfigToCell(config: CoinLauncherConfig): Cell {
    return beginCell()
        .storeRef(config.minter_code)
        .storeRef(config.wallet_code)
        .storeAddress(config.admin_address)
        .storeAddress(config.router_address)
        .storeAddress(config.router_pton_wallet_address)
        .endCell();
}

export class CoinLauncher implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new CoinLauncher(address);
    }

    static createFromConfig(config: CoinLauncherConfig, code: Cell, workchain = 0) {
        const data = CoinLauncherConfigToCell(config);
        const init = {code, data};
        return new CoinLauncher(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }


    async sendLaunchJetton(provider: ContractProvider, via: Sender, content: Cell, value: bigint) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeRef(content)
                .endCell(),
            value: value,
        });
    }


}
