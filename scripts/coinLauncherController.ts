import {Address, Cell, OpenedContract, toNano} from '@ton/core';
import {compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import {jettonContentToCell, JettonMinterBC} from '../wrappers/JettonMinterBC';
import {promptAddress, promptAmount, promptBool, promptUrl, waitForTransaction} from '../wrappers/ui-utils';
import {TonClient} from "@ton/ton";
import {CoinLauncher} from "../wrappers/CoinLauncher";

let coinLauncherContract: OpenedContract<CoinLauncher>;

const userActions = ["Launch Jetton"];
const urlPrompt = 'Please specify url pointing to jetton metadata(json):';


const launchJetton = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();

    let contentUrl = await promptUrl(urlPrompt, ui);
    ui.write(`Jetton content url:${contentUrl}`);

    let dataCorrect = false;
    do {
        ui.write("Please verify data:\n")
        ui.write('Metadata url:' + contentUrl);
        dataCorrect = await promptBool('Is everything ok?(y/n)', ['y', 'n'], ui);
        if (!dataCorrect) {
            contentUrl = await promptUrl(urlPrompt, ui);
        }
    } while (!dataCorrect);

    const curState = await (provider.api() as TonClient).getContractState(coinLauncherContract.address);

    if (curState.lastTransaction === null)
        throw ("Last transaction can't be null on deployed contract");

    const content = jettonContentToCell({type:1,uri:contentUrl});

    const res = await coinLauncherContract.sendLaunchJetton(sender,
        content
    );
    const gotTrans = await waitForTransaction(provider,
        coinLauncherContract.address,
        curState.lastTransaction.lt,
        10);
}


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const hasSender = sender.address !== undefined;
    const api = provider.api()
    const coinLauncherCode = await compile('CoinLauncher');
    let done = false;
    let retry: boolean;
    let coinLauncherAddress: Address;

    do {
        retry = false;
        coinLauncherAddress = await promptAddress('Please enter coin launcher address:', ui);
        const contractState = await (provider.api() as TonClient).getContractState(coinLauncherAddress);
        if (contractState.state !== "active" || contractState.code == null) {
            retry = true;
            ui.write("This contract is not active!\nPlease use another address, or deploy it firs");
        } else {
            const stateCode = Cell.fromBoc(contractState.code)[0];
            if (!stateCode.equals(coinLauncherCode)) {
                ui.write("Contract code differs from the current contract version!\n");
                const resp = await ui.choose("Use address anyway", ["Yes", "No"], (c) => c);
                retry = resp == "No";
            }
        }
    } while (retry);

    coinLauncherContract = provider.open(CoinLauncher.createFromAddress(coinLauncherAddress));
    do {
        const action = await ui.choose("Pick action:", userActions, (c) => c);
        switch (action) {
            case "Launch Jetton":
                await launchJetton(provider, ui);
                break;
        }
    } while (!done);
}
