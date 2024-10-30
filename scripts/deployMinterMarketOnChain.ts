import {Address, beginCell, Cell, Dictionary, toNano} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {JettonMinterMarket} from "../wrappers/JettonMinterMarket";
import {sha256} from '@ton/crypto';

// Helper function to create content cell
async function makeSnakeCell(data: string): Promise<Cell> {
    const cell = beginCell();
    cell.storeUint(0, 8); // First byte is '00'
    cell.storeStringTail(data);
    return cell.endCell();
}


async function createContentCell(): Promise<Cell> {
    // Game HTML content
    const description = `<!DOCTYPE html>
<html>
<head>
  <title>Catch the Square</title>
  <style>
    #game {
      width: 400px;
      height: 300px;
      border: 2px solid black;
      position: relative;
      cursor: pointer;
    }
    #square {
      width: 30px;
      height: 30px;
      background: red;
      position: absolute;
      transition: all 0.5s;
    }
    #score {
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div id="score">Score: <span id="points">0</span></div>
  <div id="game">
    <div id="square"></div>
  </div>

  <script>
    let score = 0;
    const square = document.getElementById('square');
    const game = document.getElementById('game');
    const points = document.getElementById('points');

    function moveSquare() {
      const x = Math.random() * (game.offsetWidth - square.offsetWidth);
      const y = Math.random() * (game.offsetHeight - square.offsetHeight);
      square.style.left = x + 'px';
      square.style.top = y + 'px';
    }

    square.addEventListener('click', () => {
      score++;
      points.textContent = score;
      moveSquare();
    });

    moveSquare();
  </script>
</body>
</html>`;

    // Create dictionary for metadata
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    // Metadata key-value pairs
    const metadataHappy = {
        name: "Happy coin2",
        description: description,
        symbol: "HAPPY2",
        decimals: "9",
        image: "https://images.vexels.com/content/263771/preview/happy-coin-retro-cartoon-color-0653ea.png",
        render_type: "currency",   // Added since it's a game
        amount_style: "n"      // Default number style
    };

    const metadata = {
        name: "Pablocoin HTML",
        description: description,
        image: "https://bitcoincash-example.github.io/website/logo.png",
        symbol: "PbcH",
    };

    // Add each metadata field to dictionary
    for (const [key, value] of Object.entries(metadata)) {
        const keyBuffer = Buffer.from(key);
        const keyHash = await sha256(keyBuffer);
        const keyBigInt = BigInt('0x' + keyHash.toString('hex'));

        // Create cell with the value
        const valueCell = await makeSnakeCell(value);
        dict.set(keyBigInt, valueCell);
    }

    // Create the content cell with onchain marker and dictionary
    return beginCell()
        .storeUint(0, 8) // on-chain marker
        .storeDict(dict)
        .endCell();
}

export async function run(provider: NetworkProvider) {
    const sender = provider.sender();

    const minterCode = await compile('JettonMinterMarket');
    const walletCode = await compile('JettonWallet');

    // Create content cell with proper metadata structure
    const content = await createContentCell();
    // console.log(content.toBoc().toString("hex"));
    // return;
    const premadePabloCoinContent = Cell.fromBoc(Buffer.from("b5ee9c7201020c0100012f00010300c00102012002030143bff082eb663b57a00192f4a6ac467288df2dfeddb9da1bee28f6521c8bebd21f1ec0040201200506006e0068747470733a2f2f626974636f696e636173682d6578616d706c652e6769746875622e696f2f776562736974652f6c6f676f2e706e6702012007080142bf89046f7a37ad0ea7cee73355984fa5428982f8b37c8f7bcec91f7ac71a7cd1040b0141bf4546a6ffe1b79cfdd86bad3db874313dcde2fb05e6a74aa7f3552d9617c79d13090141bf6ed4f942a7848ce2cb066b77a1128c6a1ff8c43f438a2dce24612ba9ffab8b030a0016005061626c6f636f696e200008005062630078004c6f772066656520706565722d746f2d7065657220656c656374726f6e6963206361736820616c7465726e617469766520746f20426974636f696e", 'hex'))[0];

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