import {Address, Cell, OpenedContract, toNano} from '@ton/core';
import {compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import {JettonMinterBC} from '../wrappers/JettonMinterBC';
import {promptAddress, promptAmount, promptBool, waitForTransaction} from '../wrappers/ui-utils';
import {TonClient} from "@ton/ton";

let minterBCContract: OpenedContract<JettonMinterBC>;

const userActions = ["Buy"];


const buyCoinsAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let tonAmount: string;

    do {
        retry = false;
        tonAmount = await promptAmount('Please provide TON amount in decimal:', ui);
        ui.write(`Buy coins for ${tonAmount} ton on ${minterBCContract.address}\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    ui.write(`Buying ${tonAmount} on ${minterBCContract.address}\n`);
    const curState = await (provider.api() as TonClient).getContractState(minterBCContract.address);

    if (curState.lastTransaction === null)
        throw ("Last transaction can't be null on deployed contract");

    const res = await minterBCContract.sendBuy(sender,
        toNano(tonAmount),
    );
    const gotTrans = await waitForTransaction(provider,
        minterBCContract.address,
        curState.lastTransaction.lt,
        10);
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const hasSender = sender.address !== undefined;
    const api = provider.api()
    const minterCode = await compile('JettonMinterBC');
    let done = false;
    let retry: boolean;
    let minterAddress: Address;

    do {
        retry = false;
        minterAddress = await promptAddress('Please enter minter address:', ui);
        const contractState = await (provider.api() as TonClient).getContractState(minterAddress);
        if (contractState.state !== "active" || contractState.code == null) {
            retry = true;
            ui.write("This contract is not active!\nPlease use another address, or deploy it firs");
        } else {
            const stateCode = Cell.fromBoc(contractState.code)[0];
            if (!stateCode.equals(minterCode)) {
                ui.write("Contract code differs from the current contract version!\n");
                const resp = await ui.choose("Use address anyway", ["Yes", "No"], (c) => c);
                retry = resp == "No";
            }
        }
    } while (retry);

    minterBCContract = provider.open(JettonMinterBC.createFromAddress(minterAddress));
    const isAdmin = hasSender ? (await minterBCContract.getAdminAddress()).equals(sender.address) : true;
    do {
        const action = await ui.choose("Pick action:", userActions, (c) => c);
        switch (action) {
            case 'Buy':
                await buyCoinsAction(provider, ui);
                break;
        }
    } while (!done);
}
