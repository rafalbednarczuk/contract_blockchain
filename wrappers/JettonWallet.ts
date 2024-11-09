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
import {Op} from "./JettonConstants";

export type JettonWalletConfig = {};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell().endCell();
}

export class JettonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = {code, data};
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getJettonBalance(provider: ContractProvider) {
        let state = await provider.getState();
        if (state.state.type !== 'active') {
            return 0n;
        }
        let res = await provider.get('get_wallet_data', []);
        return res.stack.readBigNumber();
    }

    async getJettonMasterAddress(provider: ContractProvider) {
        let state = await provider.getState();
        if (state.state.type !== 'active') {
            throw ("Contract not deployed");
        }
        let res = await provider.get('get_wallet_data', []);
        const balance = res.stack.readBigNumber()
        const ownerAddress = res.stack.readAddress();
        return res.stack.readAddress();
    }

    static transferMessage(jetton_amount: bigint, to: Address,
                           responseAddress: Address,
                           customPayload: Cell | null,
                           forward_ton_amount: bigint,
                           forwardPayload: Cell | null) {
        return beginCell().storeUint(Op.transfer, 32).storeUint(0, 64) // op, queryId
            .storeCoins(jetton_amount)
            .storeAddress(to)
            .storeAddress(responseAddress)
            .storeMaybeRef(customPayload)
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(forwardPayload)
            .endCell();
    }

    async sendTransfer(provider: ContractProvider,
                       via: Sender,
                       value: bigint,
                       jetton_amount: bigint,
                       to: Address,
                       responseAddress: Address | null,
                       customPayload: Cell | null,
                       forward_ton_amount: bigint,
                       forwardPayload: Cell) {
        const body = beginCell().storeUint(0xf8a7ea5, 32).storeUint(0, 64) // op, queryId
            .storeCoins(jetton_amount)
            .storeAddress(to)
            .storeAddress(responseAddress)
            .storeMaybeRef(customPayload)
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(forwardPayload)
            .endCell();
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
            value: value
        });

    }

    async sendSellJettons(provider: ContractProvider,
                          via: Sender,
                          value: bigint,
                          jetton_amount: bigint,
                          minter_address: Address,
    ) {
        const body = beginCell().storeUint(Op.burn, 32).storeUint(0, 64) // op, queryId
            .storeCoins(jetton_amount)
            .storeAddress(via.address)
            .endCell();
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
            value: value
        });

    }


    /*
      burn#595f07bc query_id:uint64 amount:(VarUInteger 16)
                    response_destination:MsgAddress custom_payload:(Maybe ^Cell)
                    = InternalMsgBody;
    */
    static burnMessage(jetton_amount: bigint,
                       responseAddress: Address,
                       customPayload: Cell | null) {
        return beginCell().storeUint(Op.burn, 32).storeUint(0, 64) // op, queryId
            .storeCoins(jetton_amount).storeAddress(responseAddress)
            .storeMaybeRef(customPayload)
            .endCell();
    }

    async sendBurn(provider: ContractProvider, via: Sender, value: bigint,
                   jetton_amount: bigint,
                   responseAddress: Address,
                   customPayload: Cell) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonWallet.burnMessage(jetton_amount, responseAddress, customPayload),
            value: value
        });

    }

}
