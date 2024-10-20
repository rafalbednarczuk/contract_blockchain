import {Address, Cell, toNano} from '@ton/core';
import {compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import {promptAddress, promptBool, promptUrl} from '../wrappers/ui-utils';
import {jettonContentToCell, JettonMinterMarket, JettonMinterMakerConfigToCell} from "../wrappers/JettonMinterMarket";


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();

    const minterCode = await compile('JettonMinterMarket');
    const walletCode = await compile('JettonWallet');

    const contentUrl = "https://gist.githubusercontent.com/rafalbednarczuk/4cf2456db6429dcb0bb098a2d2492e8a/raw/697582e6d9b1a7fe52ba9440f6e0adf2916531b3/gistfile1.txt";
    const content = jettonContentToCell({type: 1, uri: contentUrl});

    const jettonMinterMaker = JettonMinterMarket.createFromConfig({
            admin: sender.address!,
            content: content,
            wallet_code: walletCode,
        },
        minterCode,
    );

    const jettonMinterMakerContract = provider.open(jettonMinterMaker);
    await jettonMinterMakerContract.sendDeploy(sender, toNano("0.2"));
    await provider.waitForDeploy(jettonMinterMakerContract.address, 100);
}
