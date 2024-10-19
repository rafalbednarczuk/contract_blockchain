import {Address, beginCell, Cell, OpenedContract, toNano} from '@ton/core';
import {compile, NetworkProvider, UIProvider} from '@ton/blueprint';
import {jettonContentToCell, JettonMinterBC} from '../wrappers/JettonMinterBC';
import {promptAddress, promptAmount, promptBool, promptUrl, waitForTransaction} from '../wrappers/ui-utils';
import {TonClient} from "@ton/ton";
import {CoinLauncher} from "../wrappers/CoinLauncher";
import {JettonWallet} from "../wrappers/JettonWallet";

const userActions = ["Provide liquidity"];
let proxyTonWallet: OpenedContract<JettonWallet>;
let dogsWallet: OpenedContract<JettonWallet>;
let shrekWallet: OpenedContract<JettonWallet>;

function createJettonTransferCell(
    queryId: bigint,
    amount: bigint,
    destination: string,
    responseDestination: string,
    customPayload: Cell | null,
    forwardTonAmount: bigint,
    forwardPayload: Cell
): Cell {
    return beginCell()
        .storeUint(0x0f8a7ea5, 32) // opcode for Jetton Transfer
        .storeUint(queryId, 64)
        .storeCoins(amount)
        .storeAddress(Address.parse(destination))
        .storeAddress(responseDestination ? Address.parse(responseDestination) : null)
        .storeMaybeRef(customPayload)
        .storeCoins(forwardTonAmount)
        .storeBit(true) // forward_payload in this case is not empty
        .storeRef(forwardPayload)
        .endCell();
}

function createStonfiProvideLiquidityCell(
    tokenWallet: string,
    minLpOut: bigint
): Cell {
    return beginCell()
        .storeUint(4244235663, 32) // op_code for StonfiProvideLiquidity
        .storeAddress(Address.parse(tokenWallet))
        .storeCoins(minLpOut)
        .endCell();
}

const provideLiquidity = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();

    /*    const proxyTonRes = await proxyTonWallet.sendTransfer(sender,
            toNano(0.2),
            //Transfer 0.1TON to pool
            toNano("0.1"),
            //Ston.fi dex, stonfi_router
            Address.parse("EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt"),
            null,
            null,
            //forward amount
            toNano("0.05"),
            // Jetton (Dogs/Shrek) wallet of StonfiDex router
            createStonfiProvideLiquidityCell(
                'EQD7YHrZgQ3aNX6cz7lePsSYDFOh0A7F45Pf8UaRYvz4WXBn',
                1n
            ),
        );
    */

    // const dogsRes = await dogsWallet.sendTransfer(sender,
    //     toNano(0.32),
    //     1741759194870n,
    //     Address.parse("0:779dcc815138d9500e449c5291e7f12738c23d575b5310000f6a253bd607384e"),
    //     Address.parse("0:f1063a1ef7158bb2feaf448a7d47d7324a848d487c269fbba3371e6b330ff891"),
    //     null,
    //     240000000n,
    //     createStonfiProvideLiquidityCell(
    //         '0:1150b518b2626ad51899f98887f8824b70065456455f7fe2813f012699a4061f',
    //         1n
    //     ),
    // );

    const shrekRes = await shrekWallet.sendTransfer(sender,
        toNano(0.3),
        //Jetton amount
        toNano("1000"),
        //Ston.fi dex, stonfi_router
        Address.parse("EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt"),
        //User wallet address
        Address.parse("UQDxBjoe9xWLsv6vRIp9R9cySoSNSHwmn7ujNx5rMw_4kbRg"),
        null,
        //forward ton amount
        toNano("0.1"),
        //Proxy TON wallet
        createStonfiProvideLiquidityCell(
            'EQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGH6aC',
            1n
        ),
    );
}


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const hasSender = sender.address !== undefined;
    const api = provider.api()
    let done = false;
    let retry: boolean;
    let coinLauncherAddress: Address;
    proxyTonWallet = provider.open(JettonWallet.createFromAddress(Address.parse("EQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGH6aC")));
    dogsWallet = provider.open(JettonWallet.createFromAddress(Address.parse("EQCn5PINz6NMhAwp9tHPtSI346XFSwEQ2lmDXpoxFaBTR6Bk")));
    shrekWallet = provider.open(JettonWallet.createFromAddress(Address.parse("EQCcL4ZNfo81VT6ipa7UegZ8n8gtjDBvJwQjT2dL_OLtrxId")));

    do {
        const action = await ui.choose("Pick action:", userActions, (c) => c);
        switch (action) {
            case "Provide liquidity":
                await provideLiquidity(provider, ui);
                break;
        }
        done = true;
    } while (!done);
}
