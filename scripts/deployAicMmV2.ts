import { toNano } from '@ton/core';
import { JettonWallet } from '../wrappers/JettonWallet';
import { compile, NetworkProvider } from '@ton/blueprint';
import { AicMmV2 } from '../wrappers/AicMmV2';

export async function run(provider: NetworkProvider) {
    const jettonWallet = AicMmV2.createFromConfig({}, await compile('AicMmV2'));

    await provider.deploy(jettonWallet, toNano('0.05'));

    const openedContract = provider.open(jettonWallet);

    // run methods on `openedContract`
}
