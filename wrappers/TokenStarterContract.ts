import {
    address,
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
} from "@ton/core";

export type StarterContractConfig = {
    masterAddress: Address;
}

export function starterContractConfigToCell(config: StarterContractConfig): Cell {
    return beginCell()
        .storeAddress(config.masterAddress)
        .endCell();
}

export class TokenStarterContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {
    }

    static createFromConfig(config: StarterContractConfig, code: Cell, workchain = 0) {
        const data = starterContractConfigToCell(config);

        const init = {code, data};
        const address = contractAddress(workchain, init);

        return new TokenStarterContract(address, init);
    }

    async sendDeploy(
        provider: ContractProvider,
        sender: Sender,
        value: bigint,
    ) {
        const msg_body = beginCell().storeUint(2, 32).endCell();
        await provider.internal(sender, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msg_body,
        });
    }

    async sendCreateToken(
        provider: ContractProvider,
        sender: Sender,
        value: bigint,
        jettonWalletCode: Cell,
    ) {
        const msg_body = beginCell().storeUint(1, 32).storeRef(jettonWalletCode).endCell();
        await provider.internal(sender, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msg_body,
        });
    }


    async getData(provider: ContractProvider) {
        const {stack} = await provider.get("get_contract_storage_data", []);
        return {
            master_address: stack.readAddress(),
        };
    }

    async getBalance(provider: ContractProvider) {
        const {stack} = await provider.get("balance", []);
        return {
            balance: stack.readNumber(),
        };
    }
}