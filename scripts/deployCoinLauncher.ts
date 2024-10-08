import {Address, toNano} from '@ton/core';
import {compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import {promptAddress, promptBool, promptUrl} from '../wrappers/ui-utils';
import {CoinLauncher} from "../wrappers/CoinLauncher";


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();

    const minter_code = await compile('JettonMinterBC');
    const wallet_code = await compile('JettonWallet');

    const coinLauncher = CoinLauncher.createFromConfig({
            minter_code,
            wallet_code,
        },
        await compile('CoinLauncher'));

    const coinLauncherContract = provider.open(coinLauncher);
    await coinLauncherContract.sendDeploy(sender, toNano("0.2"));
    await provider.waitForDeploy(coinLauncherContract.address, 100);
}
