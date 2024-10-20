import {Address, Cell, toNano} from '@ton/core';
import {compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import {promptAddress, promptBool, promptUrl} from '../wrappers/ui-utils';
import {jettonContentToCell, JettonMinterMarket, JettonMinterMakerConfigToCell} from "../wrappers/JettonMinterMarket";


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();

    const minterCode = await compile('JettonMinterMarket');
    const walletCode = await compile('JettonWallet');

    const contentUrl = "https://gist.githubusercontent.com/rafalbednarczuk/988b9cde29434b9ae055e651d350e217/raw/f96c3964b4312803504c54bc8d76efc9163e8283/gistfile1.txt";
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
