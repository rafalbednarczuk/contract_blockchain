import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';

export type BondingCurveTestConfig = {};

export function BondingCurveTestConfigToCell(config: BondingCurveTestConfig): Cell {
    return beginCell().endCell();
}

export class BondingCurveTest implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new BondingCurveTest(address);
    }

    static createFromConfig(config: BondingCurveTestConfig, code: Cell, workchain = 0) {
        const data = BondingCurveTestConfigToCell(config);
        const init = {code, data};
        return new BondingCurveTest(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }


}
