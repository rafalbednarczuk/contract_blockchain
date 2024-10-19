import {Address, beginCell, Cell, fromNano, OpenedContract, toNano} from '@ton/core';
import {compile, sleep, NetworkProvider, UIProvider} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';
import {promptBool, promptAmount, promptAddress, displayContentCell, waitForTransaction} from '../wrappers/ui-utils';
import {TonClient} from "@ton/ton";

let jetonWalletContract: OpenedContract<JettonWallet>;

const actions = ['Send Jettons', 'Sell Jettons'];


const failedTransMessage = (ui: UIProvider) => {
    ui.write("Failed to get indication of transaction completion from API!\nCheck result manually, or try again\n");

};

const sendJettons = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let receiverAddress: Address;
    let jettonAmount: string;

    do {
        retry = false;
        receiverAddress = await promptAddress(`Please specify jetton owner receiver address`, ui);
        jettonAmount = await promptAmount('Please provide jetton amount in decimal form:', ui);
        ui.write(`Send ${jettonAmount} tokens to ${receiverAddress}\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    }
    while (retry) ;

    ui.write(`Sending ${jettonAmount} to ${receiverAddress}\n`);
    const curState = await (provider.api() as TonClient).getContractState(jetonWalletContract.address);

    if (curState.lastTransaction === null)
        throw ("Last transaction can't be null on deployed contract");

    const res = await jetonWalletContract.sendTransfer(sender,
        toNano("0.1"),
        toNano(jettonAmount),
        receiverAddress,
        sender.address!!,
        beginCell().endCell(),
        //Forward amount have to be higher than 1 nano TON, otherwise the message isn't going to be delivered as no gas
        //Otherwise. Skipped: true, Skip reason: cskip_no_gas
        toNano("0.03"),
        beginCell().endCell(),
    );
    const gotTrans = await waitForTransaction(provider,
        jetonWalletContract.address,
        curState.lastTransaction.lt,
        10);
}

const sellJettons = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let jettonAmount: string;

    do {
        retry = false;
        jettonAmount = await promptAmount('Please provide jetton amount in decimal form:', ui);
        ui.write(`Burn/Sell ${jettonAmount} tokens \n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    }
    while (retry) ;

    ui.write(`Burning/Sending ${jettonAmount} \n`);
    const curState = await (provider.api() as TonClient).getContractState(jetonWalletContract.address);

    if (curState.lastTransaction === null)
        throw ("Last transaction can't be null on deployed contract");


    const res = await jetonWalletContract.sendBurn(
        sender,
        toNano("0.1"),
        toNano(jettonAmount),
        sender.address!,
        beginCell().endCell(),
    );
    const gotTrans = await waitForTransaction(provider,
        jetonWalletContract.address,
        curState.lastTransaction.lt,
        10);
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const hasSender = sender.address !== undefined;
    const api = provider.api()
    const jettonCode = await compile('JettonWallet');
    let done = false;
    let retry: boolean;
    let jettonWalletAddress: Address;

    do {
        retry = false;
        jettonWalletAddress = await promptAddress('Please enter your jetton wallet address:', ui);
        const contractState = await (provider.api() as TonClient).getContractState(jettonWalletAddress);
        if (contractState.state !== "active" || contractState.code == null) {
            retry = true;
            ui.write("This contract is not active!\nPlease use another address, or deploy it firs");
        } else {
            const stateCode = Cell.fromBoc(contractState.code)[0];
            if (!stateCode.equals(jettonCode)) {
                ui.write("Contract code differs from the current contract version!\n");
                const resp = await ui.choose("Use address anyway", ["Yes", "No"], (c) => c);
                retry = resp == "No";
            }
        }
    } while (retry);

    jetonWalletContract = provider.open(JettonWallet.createFromAddress(jettonWalletAddress));

    do {
        const action = await ui.choose("Pick action:", actions, (c) => c);
        switch (action) {
            case 'Send Jettons':
                await sendJettons(provider, ui);
                break;
            case 'Sell Jettons':
                await sellJettons(provider, ui);
                break;
        }
    } while (!done);
}
