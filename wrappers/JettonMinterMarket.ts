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

export type JettonMinterMakerContent = {
    type: 0 | 1,
    uri: string
};

export type JettonMinterMakerConfig = { admin: Address; content: Cell; wallet_code: Cell };

export function JettonMinterMakerConfigToCell(config: JettonMinterMakerConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.admin)
        .storeRef(config.content)
        .storeRef(config.wallet_code)
        .endCell();
}

export function jettonContentToCell(content: JettonMinterMakerContent) {
    return beginCell()
        .storeUint(content.type, 8)
        .storeStringTail(content.uri) //Snake logic under the hood
        .endCell();
}

export class JettonMinterMarket implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new JettonMinterMarket(address);
    }

    static createFromConfig(config: JettonMinterMakerConfig, code: Cell, workchain = 0) {
        const data = JettonMinterMakerConfigToCell(config);
        const init = {code, data};
        return new JettonMinterMarket(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendBuy(provider: ContractProvider, via: Sender, value: bigint, query_id: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Op.buy_coins, 32)
                .storeUint(query_id, 64)
                .endCell(),
        });
    }

    protected static jettonInternalTransfer(jetton_amount: bigint,
                                            forward_ton_amount: bigint,
                                            response_addr?: Address,
                                            query_id: number | bigint = 0) {
        return beginCell()
            .storeUint(Op.internal_transfer, 32)
            .storeUint(query_id, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(response_addr)
            .storeCoins(forward_ton_amount)
            .storeBit(false)
            .endCell();

    }

    static mintMessage(from: Address, to: Address, jetton_amount: bigint, forward_ton_amount: bigint, total_ton_amount: bigint, query_id: number | bigint = 0) {
        const mintMsg = beginCell()
            .storeUint(Op.internal_transfer, 32)
            .storeUint(0, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(from) // Response addr
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(null)
            .endCell();

        return beginCell().storeUint(Op.mint, 32).storeUint(query_id, 64) // op, queryId
            .storeAddress(to)
            .storeCoins(total_ton_amount)
            .storeCoins(jetton_amount)
            .storeRef(mintMsg)
            .endCell();
    }

    /* provide_wallet_address#2c76b973 query_id:uint64 owner_address:MsgAddress include_address:Bool = InternalMsgBody;
    */
    static discoveryMessage(owner: Address, include_address: boolean) {
        return beginCell().storeUint(Op.provide_wallet_address, 32).storeUint(0, 64) // op, queryId
            .storeAddress(owner).storeBit(include_address)
            .endCell();
    }

    async sendDiscovery(provider: ContractProvider, via: Sender, owner: Address, include_address: boolean, value: bigint = toNano('0.1')) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterMarket.discoveryMessage(owner, include_address),
            value: value,
        });
    }

    static withdrawFeesMessage(owner: Address) {
        return beginCell()
            .storeUint(Op.withdraw_fees, 32) // op
            .storeUint(0, 64) // query id
            .storeAddress(owner)
            .endCell();
    }

    async sendWithdrawFees(provider: ContractProvider, via: Sender, owner: Address, value: bigint = toNano('0.1')) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterMarket.withdrawFeesMessage(owner),
            value: value,
        });
    }

    static changeAdminMessage(newOwner: Address) {
        return beginCell().storeUint(Op.change_admin, 32).storeUint(0, 64) // op, queryId
            .storeAddress(newOwner)
            .endCell();
    }

    async sendChangeAdmin(provider: ContractProvider, via: Sender, newOwner: Address) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterMarket.changeAdminMessage(newOwner),
            value: toNano("0.05"),
        });
    }

    static changeContentMessage(content: Cell) {
        return beginCell().storeUint(Op.change_content, 32).storeUint(0, 64) // op, queryId
            .storeRef(content)
            .endCell();
    }

    async sendChangeContent(provider: ContractProvider, via: Sender, content: Cell) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinterMarket.changeContentMessage(content),
            value: toNano("0.05"),
        });
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [{
            type: 'slice',
            cell: beginCell().storeAddress(owner).endCell()
        }])
        return res.stack.readAddress()
    }

    async getJettonData(provider: ContractProvider) {
        let res = await provider.get('get_jetton_data', []);
        let totalSupply = res.stack.readBigNumber();
        let mintable = res.stack.readBoolean();
        let adminAddress = res.stack.readAddress();
        let content = res.stack.readCell();
        let walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode
        };
    }

    async getTotalSupply(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.totalSupply;
    }

    async getAdminAddress(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.adminAddress;
    }

    async getContent(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.content;
    }
}
