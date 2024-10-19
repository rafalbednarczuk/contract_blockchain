import {Address, beginCell, Cell, fromNano, OpenedContract, toNano} from '@ton/core';
import {compile, sleep, NetworkProvider, UIProvider} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';
import {promptBool, promptAmount, promptAddress, displayContentCell, waitForTransaction} from '../wrappers/ui-utils';
import {TonClient} from "@ton/ton";
import {JettonMinterMarket} from "../wrappers/JettonMinterMarket";

let minterContract: OpenedContract<JettonMinterMarket>;

const actions = ['Buy Jettons'];


const buyJettons = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let tonAmount: string;

    do {
        retry = false;
        tonAmount = await promptAmount('Please provide ton amount in decimal form:', ui);
        ui.write(`Swap ${tonAmount} ton to Jettons? }\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    }
    while (retry) ;

    ui.write(`Sending ${tonAmount} to ${sender.address}\n`);
    const curState = await (provider.api() as TonClient).getContractState(minterContract.address);

    if (curState.lastTransaction === null)
        throw ("Last transaction can't be null on deployed contract");

    const res = await minterContract.sendBuy(sender,
        toNano(tonAmount),
        0n
    );
    const gotTrans = await waitForTransaction(provider,
        minterContract.address,
        curState.lastTransaction.lt,
        10);
}


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const hasSender = sender.address !== undefined;
    const api = provider.api()
    const minterMakerCode = await compile('JettonMinterMarket');
    let done = false;
    let retry: boolean;
    let minterMakerAddress: Address;

    do {
        retry = false;
        minterMakerAddress = await promptAddress('Please enter your minter address:', ui);
        const contractState = await (provider.api() as TonClient).getContractState(minterMakerAddress);
        if (contractState.state !== "active" || contractState.code == null) {
            retry = true;
            ui.write("This contract is not active!\nPlease use another address, or deploy it firs");
        } else {
            const stateCode = Cell.fromBoc(contractState.code)[0];
            if (!stateCode.equals(minterMakerCode)) {
                ui.write("Contract code differs from the current contract version!\n");
                const resp = await ui.choose("Use address anyway", ["Yes", "No"], (c) => c);
                retry = resp == "No";
            }
        }
    } while (retry);

    minterContract = provider.open(JettonMinterMarket.createFromAddress(minterMakerAddress));

    do {
        const action = await ui.choose("Pick action:", actions, (c) => c);
        switch (action) {
            case 'Buy Jettons':
                await buyJettons(provider, ui);
                break;
        }
    } while (!done);
}
