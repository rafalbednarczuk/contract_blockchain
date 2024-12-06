import {Address, beginCell, Cell, Dictionary, toNano} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {JettonMinterMarket} from "../wrappers/JettonMinterMarket";
import {sha256} from '@ton/crypto';
import {JettonMinterMarketStonfi} from "../wrappers/JettonMinterMarketStonfi";

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
    const dancingStickManV0 = "<!DOCTYPE html><html><head><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}.upload-container{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:1000}.upload-button{background:linear-gradient(45deg,#ff3366,#ff6b6b);color:#fff;padding:12px 0;border-radius:25px;border:none;font-family:Arial,sans-serif;font-size:16px;cursor:pointer;box-shadow:0 4px 15px rgba(255,51,102,.3);transition:all .3s ease;display:flex;align-items:center;gap:8px}.upload-button:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(255,51,102,.4)}.upload-button:active{transform:translateY(0)}#photoInput{display:none}.stickman-container{display:flex;justify-content:center;align-items:center;height:100vh;width:100vw;background:0 0;overflow:hidden;position:relative}.stickman{position:absolute;top:15%;left:50%;transform:translate(-50%,0);animation:dance 2s infinite;height:90vh;z-index:2}.head{width:10vh;height:10vh;position:absolute;left:50%;transform:translateX(-50%);animation:crazyHeadBob 1s infinite;background-image:url('https://appincoin.fun/icon.jpg');background-size:cover;background-position:center;border-radius:50%;z-index:10}.body{width:8vh;height:20vh;position:absolute;top:10vh;left:50%;transform:translateX(-50%);transform-origin:top;animation:sillyBodyWave 1s infinite;background-image:url('https://appincoin.fun/icon.jpg');background-size:cover;background-position:center;border-radius:2vh}.arms{position:absolute;top:12vh;width:12vh;left:50%;transform:translateX(-50%)}.arm{position:absolute;top:0;width:3vh}.arm.left{left:0}.arm.right{right:0}.upper-arm{width:3vh;height:8vh;position:absolute;transform-origin:top;background-image:url('https://appincoin.fun/icon.jpg');background-size:cover;background-position:center;border-radius:1.5vh}.left .upper-arm{animation:leftUpperArm 1s infinite}.right .upper-arm{animation:rightUpperArm 1s infinite}.forearm-container{position:absolute;top:8vh;width:3vh;height:1vh;transform-origin:top}.forearm{width:2.5vh;height:8vh;position:absolute;top:0;transform-origin:top;background-image:url('https://appincoin.fun/icon.jpg');background-size:cover;background-position:center;border-radius:1.25vh}.left .forearm{animation:leftForearm 1s infinite}.right .forearm{animation:rightForearm 1s infinite}.legs{position:absolute;top:30vh;width:12vh;left:50%;transform:translateX(-50%)}.leg{position:absolute;top:0;width:3.5vh}.leg.left{left:0}.leg.right{right:0}.thigh{width:3.5vh;height:12vh;position:absolute;transform-origin:top;background-image:url('https://appincoin.fun/icon.jpg');background-size:cover;background-position:center;border-radius:1.75vh}.left .thigh{animation:leftThigh 1s infinite}.right .thigh{animation:rightThigh 1s infinite}.calf-container{position:absolute;top:12vh;width:3.5vh;height:1vh;transform-origin:top}.calf{width:3vh;height:12vh;position:absolute;top:0;transform-origin:top;background-image:url('https://appincoin.fun/icon.jpg');background-size:cover;background-position:center;border-radius:1.5vh}.left .calf{animation:leftCalf 1s infinite}.right .calf{animation:rightCalf 1s infinite}.disco-light{position:absolute;width:30vw;height:30vw;border-radius:50%;filter:blur(10vw);opacity:.4;animation:crazyLight 4s infinite;z-index:1}.light1{background:red;animation-delay:0s}.light2{background:#0f0;animation-delay:-1.3s}.light3{background:#00f;animation-delay:-2.6s}@keyframes dance{0%{transform:translate(-50%,0) rotate(-5deg)}25%{transform:translate(-50%,-5vh) rotate(5deg)}50%{transform:translate(-50%,0) rotate(-5deg)}75%{transform:translate(-50%,-2vh) rotate(5deg)}100%{transform:translate(-50%,0) rotate(-5deg)}}@keyframes crazyHeadBob{0%{transform:translateX(-50%) rotate(-15deg)}25%{transform:translateX(-50%) rotate(15deg)}50%{transform:translateX(-50%) rotate(-15deg)}75%{transform:translateX(-50%) rotate(15deg)}100%{transform:translateX(-50%) rotate(-15deg)}}@keyframes sillyBodyWave{0%{transform:translateX(-50%) rotate(-10deg) skewX(-5deg)}50%{transform:translateX(-50%) rotate(10deg) skewX(5deg)}100%{transform:translateX(-50%) rotate(-10deg) skewX(-5deg)}}@keyframes leftUpperArm{0%{transform:rotate(-45deg)}50%{transform:rotate(180deg)}100%{transform:rotate(-45deg)}}@keyframes rightUpperArm{0%{transform:rotate(45deg)}50%{transform:rotate(-180deg)}100%{transform:rotate(45deg)}}@keyframes leftForearm{0%{transform:rotate(-20deg)}25%{transform:rotate(-90deg)}75%{transform:rotate(90deg)}100%{transform:rotate(-20deg)}}@keyframes rightForearm{0%{transform:rotate(20deg)}25%{transform:rotate(90deg)}75%{transform:rotate(-90deg)}100%{transform:rotate(20deg)}}@keyframes leftThigh{0%{transform:rotate(-45deg)}50%{transform:rotate(45deg)}100%{transform:rotate(-45deg)}}@keyframes rightThigh{0%{transform:rotate(45deg)}50%{transform:rotate(-45deg)}100%{transform:rotate(45deg)}}@keyframes leftCalf{0%{transform:rotate(10deg)}25%{transform:rotate(80deg)}75%{transform:rotate(-40deg)}100%{transform:rotate(10deg)}}@keyframes rightCalf{0%{transform:rotate(-10deg)}25%{transform:rotate(-80deg)}75%{transform:rotate(40deg)}100%{transform:rotate(-10deg)}}@keyframes crazyLight{0%{transform:translate(-50%,-50%) scale(1) rotate(0)}25%{transform:translate(100%,100%) scale(2) rotate(180deg)}50%{transform:translate(100%,-50%) scale(1.5) rotate(360deg)}75%{transform:translate(-50%,100%) scale(2) rotate(540deg)}100%{transform:translate(-50%,-50%) scale(1) rotate(720deg)}}.button-container{display:flex;gap:20px}.upload-button{background:linear-gradient(45deg,#ff3366,#ff6b6b);color:#fff;padding:12px 24px;border-radius:25px;border:none;font-family:Arial,sans-serif;font-size:16px;cursor:pointer;box-shadow:0 4px 15px rgba(255,51,102,.3);transition:all .3s ease;display:flex;align-items:center;gap:8px}.unmute-button{background:linear-gradient(45deg,#4caf50,#45a049);color:#fff;padding:12px 24px;border-radius:25px;border:none;font-family:Arial,sans-serif;font-size:16px;cursor:pointer;box-shadow:0 4px 15px rgba(76,175,80,.3);transition:all .3s ease;display:flex;align-items:center;gap:8px}.upload-button:hover,.unmute-button:hover{transform:translateY(-2px)}.upload-button:hover{box-shadow:0 6px 20px rgba(255,51,102,.4)}.unmute-button:hover{box-shadow:0 6px 20px rgba(76,175,80,.4)}.upload-button:active,.unmute-button:active{transform:translateY(0)}</style></head><body><video autoplay loop muted playsinline style=\"left:50%;transform:translate(-50%,0) scale(150%,150%);position:fixed;top:0;min-width:0%;min-height:100%;width:auto;height:auto;z-index:0;object-fit:contain\"><source src=\"https://appincoin.fun/dance_song.mp4\" type=\"video/mp4\"></video><div class=\"upload-container\"><div class=\"button-container\"><label for=\"photoInput\" class=\"upload-button\"><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"17 8 12 3 7 8\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"15\"/></svg>Pick Photo</label><button class=\"unmute-button\" id=\"unmuteButton\"><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon><path d=\"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07\"></path></svg>Unmute</button></div><input type=\"file\" id=\"photoInput\" accept=\"image/*\"></div><div class=\"stickman-container\"><div class=\"disco-light light1\"></div><div class=\"disco-light light2\"></div><div class=\"disco-light light3\"></div><div class=\"stickman\"><div class=\"head\"></div><div class=\"body\"></div><div class=\"arms\"><div class=\"arm left\"><div class=\"upper-arm\"><div class=\"forearm-container\"><div class=\"forearm\"></div></div></div></div><div class=\"arm right\"><div class=\"upper-arm\"><div class=\"forearm-container\"><div class=\"forearm\"></div></div></div></div></div><div class=\"legs\"><div class=\"leg left\"><div class=\"thigh\"><div class=\"calf-container\"><div class=\"calf\"></div></div></div></div><div class=\"leg right\"><div class=\"thigh\"><div class=\"calf-container\"><div class=\"calf\"></div></div></div></div></div></div></div><script>document.getElementById('photoInput').addEventListener('change',function(e){const t=e.target.files[0];if(t){const n=new FileReader;n.onload=function(e){const t=e.target.result,n=document.querySelectorAll('.head, .body, .upper-arm, .forearm, .thigh, .calf');n.forEach(e=>{e.style.backgroundImage=`url('${t}')`})},n.readAsDataURL(t)}}),document.getElementById('unmuteButton').addEventListener('click',function(){const e=document.querySelector('video');e.muted?(e.muted=!1,this.innerHTML='<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon><path d=\"M23 9l-6 6M17 9l6 6\"></path></svg>Mute'):(e.muted=!0,this.innerHTML='<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon><path d=\"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07\"></path></svg>Unmute')})</script></body></html>";
    // Create dictionary for metadata
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    // Metadata key-value pairs
    const metadata = {
        name: "DANCE",
        description: dancingStickManV0,
        symbol: "DANCE",
        decimals: "9",
        image: "https://appincoin.fun/dancer_icon.jpg",
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

    const minterCode = await compile('JettonMinterMarketStonfi');
    const walletCode = await compile('JettonWallet');

    // Create content cell with proper metadata structure
    const content = await createContentCell();
    // console.log(content.toBoc().toString("hex"));
    // return;
    const premadePabloCoinContent = Cell.fromBoc(Buffer.from("b5ee9c7201020c0100012f00010300c00102012002030143bff082eb663b57a00192f4a6ac467288df2dfeddb9da1bee28f6521c8bebd21f1ec0040201200506006e0068747470733a2f2f626974636f696e636173682d6578616d706c652e6769746875622e696f2f776562736974652f6c6f676f2e706e6702012007080142bf89046f7a37ad0ea7cee73355984fa5428982f8b37c8f7bcec91f7ac71a7cd1040b0141bf4546a6ffe1b79cfdd86bad3db874313dcde2fb05e6a74aa7f3552d9617c79d13090141bf6ed4f942a7848ce2cb066b77a1128c6a1ff8c43f438a2dce24612ba9ffab8b030a0016005061626c6f636f696e200008005062630078004c6f772066656520706565722d746f2d7065657220656c656374726f6e6963206361736820616c7465726e617469766520746f20426974636f696e", 'hex'))[0];

    const jettonMinterMaker = JettonMinterMarketStonfi.createFromConfig({
            admin: sender.address!,
            content: content,
            wallet_code: walletCode,
            router_address: Address.parse("EQByADL5Ra2dldrMSBctgfSm2X2W1P61NVW2RYDb8eJNJGx6"),
            router_pton_wallet_address: Address.parse("EQBzIe_KYGrezmSS3ua9buM0P8vzEnMFDrsv1prFnwP43hFk"),
        },
        minterCode,
    );

    const jettonMinterMakerContract = provider.open(jettonMinterMaker);
    await jettonMinterMakerContract.sendDeploy(sender, toNano("0.2"));
    await provider.waitForDeploy(jettonMinterMakerContract.address, 100);
}