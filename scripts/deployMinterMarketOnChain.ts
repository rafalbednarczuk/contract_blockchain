import {Address, beginCell, Cell, toNano} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {jettonContentToCell, JettonMinterMarket} from "../wrappers/JettonMinterMarket";

export async function run(provider: NetworkProvider) {
    const sender = provider.sender();

    const minterCode = await compile('JettonMinterMarket');
    const walletCode = await compile('JettonWallet');

    const description =

        "<!DOCTYPE html>\n" +
        "<html>\n" +
        "<head>\n" +
        "  <title>Catch the Square</title>\n" +
        "  <style>\n" +
        "    #game {\n" +
        "      width: 400px;\n" +
        "      height: 300px;\n" +
        "      border: 2px solid black;\n" +
        "      position: relative;\n" +
        "      cursor: pointer;\n" +
        "    }\n" +
        "    #square {\n" +
        "      width: 30px;\n" +
        "      height: 30px;\n" +
        "      background: red;\n" +
        "      position: absolute;\n" +
        "      transition: all 0.5s;\n" +
        "    }\n" +
        "    #score {\n" +
        "      margin: 10px 0;\n" +
        "    }\n" +
        "  </style>\n" +
        "</head>\n" +
        "<body>\n" +
        "  <div id=\"score\">Score: <span id=\"points\">0</span></div>\n" +
        "  <div id=\"game\">\n" +
        "    <div id=\"square\"></div>\n" +
        "  </div>\n" +
        "\n" +
        "  <script>\n" +
        "    let score = 0;\n" +
        "    const square = document.getElementById('square');\n" +
        "    const game = document.getElementById('game');\n" +
        "    const points = document.getElementById('points');\n" +
        "\n" +
        "    function moveSquare() {\n" +
        "      const x = Math.random() * (game.offsetWidth - square.offsetWidth);\n" +
        "      const y = Math.random() * (game.offsetHeight - square.offsetHeight);\n" +
        "      square.style.left = x + 'px';\n" +
        "      square.style.top = y + 'px';\n" +
        "    }\n" +
        "\n" +
        "    square.addEventListener('click', () => {\n" +
        "      score++;\n" +
        "      points.textContent = score;\n" +
        "      moveSquare();\n" +
        "    });\n" +
        "\n" +
        "    moveSquare();\n" +
        "  </script>\n" +
        "</body>\n" +
        "</html>"
    // On-chain metadata
    const content = beginCell()
        .storeUint(0, 8) // on-chain marker
        .storeStringTail(JSON.stringify({
            name: "Happy coin",
            description: description,
            symbol: "HAPPY",
            decimals: 9,
            image: "https://images.vexels.com/content/263771/preview/happy-coin-retro-cartoon-color-0653ea.png" // Optional: you can still include image URL
        }))
        .endCell();

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