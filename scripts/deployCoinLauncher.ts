import {Address, toNano} from '@ton/core';
import {compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import {promptAddress, promptBool, promptUrl} from '../wrappers/ui-utils';
import {CoinLauncher} from "../wrappers/CoinLauncher";


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();

    const minter_code = await compile('JettonMinterMarketStonfi');
    const wallet_code = await compile('JettonWallet');

    const admin_address = Address.parse("UQDxBjoe9xWLsv6vRIp9R9cySoSNSHwmn7ujNx5rMw_4kbRg");
    const router_address = Address.parse("EQByADL5Ra2dldrMSBctgfSm2X2W1P61NVW2RYDb8eJNJGx6");
    const router_pton_wallet_address = Address.parse("EQBzIe_KYGrezmSS3ua9buM0P8vzEnMFDrsv1prFnwP43hFk");

    const coinLauncher = CoinLauncher.createFromConfig({
            minter_code,
            wallet_code,
            admin_address,
            router_address,
            router_pton_wallet_address
        },
        await compile('CoinLauncher'));

    const coinLauncherContract = provider.open(coinLauncher);
    await coinLauncherContract.sendDeploy(sender, toNano("0.1"));
    await provider.waitForDeploy(coinLauncherContract.address, 100);
}
