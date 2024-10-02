import {
    address,
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode, toNano,
} from "@ton/core";
import {Op} from "./JettonConstants";

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
        to: Address,
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint,
        jettonWalletCode: Cell,
        value: bigint,
    ) {
        const mintMsg = beginCell().storeUint(Op.internal_transfer, 32)
            .storeUint(0, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(this.address) // Response addr
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(null)
            .endCell();

        const msg_body = beginCell()
            .storeUint(1, 32)
            .storeAddress(to)
            .storeCoins(total_ton_amount)
            .storeRef(jettonWalletCode)
            .storeRef(mintMsg)
            .endCell();

        await provider.internal(sender, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msg_body,
        });
    }

    async getWalletAddress(provider: ContractProvider, owner: Address, jettonWalletCode: Cell): Promise<Address> {
        const res = await provider.get('get_wallet_address', [{
            type: 'slice',
            cell: beginCell().storeAddress(owner).endCell()
        },
            {
                type: 'cell',
                cell: jettonWalletCode
            },
        ])
        return res.stack.readAddress()
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