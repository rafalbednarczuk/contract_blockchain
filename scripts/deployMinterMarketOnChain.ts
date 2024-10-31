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

    const catchCoinGameV0 = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no\"><style>body{margin:0;overflow:hidden;touch-action:none;font-family:Arial,sans-serif}#game{width:100vw;height:100vh;background:#87CEEB;position:relative;cursor:pointer}#player{width:50px;height:50px;position:absolute;bottom:20px;transform:translate(-50%,0);transition:left .3s ease-out}#player img{width:100%;height:100%;display:block}#coin{width:30px;height:30px;background:#FFD700;border-radius:50%;position:absolute;top:-30px;left:50%}#score{position:absolute;top:20px;right:20px;font-size:24px;color:#fff}#gameOver{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:20px;border-radius:10px;text-align:center;display:none}button{background:#4CAF50;border:none;color:#fff;padding:15px 32px;text-align:center;text-decoration:none;display:inline-block;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px}#instructions{position:absolute;top:20px;left:20px;color:#fff;font-size:18px}</style></head><body><div id=\"game\"><div id=\"player\"><img src=\"https://appincoin.fun/icon.jpg\" alt=\"player\"></div><div id=\"coin\"></div><div id=\"score\">Score: 0</div><div id=\"instructions\">Click/tap anywhere to move</div><div id=\"gameOver\"><h2>Game Over!</h2><p>Final Score: <span id=\"finalScore\">0</span></p><button onclick=\"resetGame()\">Play Again</button></div></div><script>const game=document.getElementById('game'),player=document.getElementById('player'),coin=document.getElementById('coin'),scoreElement=document.getElementById('score'),gameOverScreen=document.getElementById('gameOver'),finalScoreElement=document.getElementById('finalScore'),PLAYER_WIDTH=50,PLAYER_HEIGHT=50,COIN_SIZE=30;let score=0,playerX=window.innerWidth/2,coinX=Math.random()*(window.innerWidth-COIN_SIZE),coinY=-COIN_SIZE,coinVelocity=2,coinAcceleration=.1,isGameOver=!1;function handleClick(e){if(!isGameOver){const x=e.type.includes('touch')?e.touches[0].clientX:e.clientX;playerX=Math.max(PLAYER_WIDTH/2,Math.min(window.innerWidth-PLAYER_WIDTH/2,x)),player.style.left=playerX+'px'}}function checkCollision(){const playerLeft=playerX-PLAYER_WIDTH/2,playerRight=playerX+PLAYER_WIDTH/2,playerTop=window.innerHeight-PLAYER_HEIGHT-20,playerBottom=window.innerHeight-20,coinCenter=coinX+COIN_SIZE/2,coinTop=coinY,coinBottom=coinY+COIN_SIZE;return Math.abs(coinCenter-(playerLeft+PLAYER_WIDTH/2))<(PLAYER_WIDTH+COIN_SIZE)/2&&!(coinTop>playerBottom||coinBottom<playerTop)}function updateGame(){isGameOver||(coinVelocity+=coinAcceleration,coinY+=coinVelocity,coin.style.top=coinY+'px',coin.style.left=coinX+'px',checkCollision()?(score++,scoreElement.textContent='Score: '+score,resetCoin()):coinY>window.innerHeight&&gameOver(),requestAnimationFrame(updateGame))}function resetCoin(){coinY=-COIN_SIZE,coinX=Math.random()*(window.innerWidth-COIN_SIZE),coinVelocity=2+.2*score,coinAcceleration=.1+.005*score}function gameOver(){isGameOver=!0,gameOverScreen.style.display='block',finalScoreElement.textContent=score}function resetGame(){score=0,coinVelocity=2,coinAcceleration=.1,isGameOver=!1,scoreElement.textContent='Score: 0',gameOverScreen.style.display='none',resetCoin(),playerX=window.innerWidth/2,player.style.left=playerX+'px',updateGame()}game.addEventListener('click',handleClick),game.addEventListener('touchstart',handleClick),game.addEventListener('touchstart',e=>e.preventDefault()),updateGame()</script></body></html>";
    const catchCoinGameV1 = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no\"><style>body{margin:0;overflow:hidden;touch-action:none;font-family:Arial,sans-serif}#game{width:100vw;height:100vh;background:#87CEEB;position:relative;cursor:pointer}#player{width:50px;height:50px;position:absolute;bottom:20px;transform:translate(-50%,0);transition:left .3s ease-out}#player img{width:100%;height:100%;display:block}#coin{width:30px;height:30px;background:#FFD700;border-radius:50%;position:absolute;top:-30px;left:50%}#score{position:absolute;top:20px;right:20px;font-size:24px;color:#fff}#gameOver{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:20px;border-radius:10px;text-align:center;display:none}button{background:#4CAF50;border:none;color:#fff;padding:15px 32px;text-align:center;text-decoration:none;display:inline-block;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px}#instructions{position:absolute;top:20px;left:20px;color:#fff;font-size:18px}</style></head><body><div id=\"game\"><div id=\"player\"><img src=\"https://appincoin.fun/icon.jpg\" alt=\"player\"></div><div id=\"coin\"></div><div id=\"score\">Score: 0</div><div id=\"instructions\">Click/tap anywhere to move</div><div id=\"gameOver\"><h2>Game Over!</h2><p>Final Score: <span id=\"finalScore\">0</span></p><button id=\"playAgain\">Play Again</button></div></div><script>const game=document.getElementById('game'),player=document.getElementById('player'),coin=document.getElementById('coin'),scoreElement=document.getElementById('score'),gameOverScreen=document.getElementById('gameOver'),finalScoreElement=document.getElementById('finalScore'),playAgainBtn=document.getElementById('playAgain'),PLAYER_WIDTH=50,PLAYER_HEIGHT=50,COIN_SIZE=30;let score=0,playerX=window.innerWidth/2,coinX=Math.random()*(window.innerWidth-COIN_SIZE),coinY=-COIN_SIZE,coinVelocity=2,coinAcceleration=.1,isGameOver=!1;function handleClick(e){if(isGameOver)return;const x=e.type.includes('touch')?e.touches[0].clientX:e.clientX;playerX=Math.max(PLAYER_WIDTH/2,Math.min(window.innerWidth-PLAYER_WIDTH/2,x)),player.style.left=playerX+'px'}function checkCollision(){const playerLeft=playerX-PLAYER_WIDTH/2,playerRight=playerX+PLAYER_WIDTH/2,playerTop=window.innerHeight-PLAYER_HEIGHT-20,playerBottom=window.innerHeight-20,coinCenter=coinX+COIN_SIZE/2,coinTop=coinY,coinBottom=coinY+COIN_SIZE;return Math.abs(coinCenter-(playerLeft+PLAYER_WIDTH/2))<(PLAYER_WIDTH+COIN_SIZE)/2&&!(coinTop>playerBottom||coinBottom<playerTop)}function updateGame(){isGameOver||(coinVelocity+=coinAcceleration,coinY+=coinVelocity,coin.style.top=coinY+'px',coin.style.left=coinX+'px',checkCollision()?(score++,scoreElement.textContent='Score: '+score,resetCoin()):coinY>window.innerHeight&&gameOver(),requestAnimationFrame(updateGame))}function resetCoin(){coinY=-COIN_SIZE,coinX=Math.random()*(window.innerWidth-COIN_SIZE),coinVelocity=2+.2*score,coinAcceleration=.1+.005*score}function gameOver(){isGameOver=!0,gameOverScreen.style.display='block',finalScoreElement.textContent=score}function resetGame(){score=0,coinVelocity=2,coinAcceleration=.1,isGameOver=!1,scoreElement.textContent='Score: 0',gameOverScreen.style.display='none',resetCoin(),playerX=window.innerWidth/2,player.style.left=playerX+'px',updateGame()}playAgainBtn.addEventListener('click',function(e){e.stopPropagation();resetGame()});playAgainBtn.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();resetGame()});game.addEventListener('click',handleClick);game.addEventListener('touchstart',handleClick);game.addEventListener('touchstart',e=>e.preventDefault());updateGame()</script></body></html>";
    // Create dictionary for metadata
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    // Metadata key-value pairs
    const metadata = {
        name: "AppInCoin Genesis",
        description: catchCoinGameV1,
        symbol: "AICG",
        decimals: "9",
        image: "https://appincoin.fun/icon.jpg",
        render_type: "currency",   // Added since it's a game
        amount_style: "n"      // Default number style
    };

    // const metadata = {
    //     name: "Pablocoin HTML",
    //     description: description,
    //     image: "https://bitcoincash-example.github.io/website/logo.png",
    //     symbol: "PbcH",
    // };

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