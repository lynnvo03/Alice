const STATE_INTRO_VIDEO = 'intro_video';
const STATE_DIALOGUE = 'dialogue';
const STATE_WELCOME = 'welcome';
const STATE_PLAYING = 'playing';
const STATE_SCORE = 'score';
const STATE_WINNER = 'winner';
const STATE_BUNNY_HURT = 'bunny_hurt'; 
const STATE_PRE_VIDEO_DIALOGUE = 'pre_video_dialogue'; 

const KEY_SPACE = ' ';
const KEY_ESCAPE = 'Escape';
const KEY_LEFT_PLAYER_UP = 'w';
const KEY_LEFT_PLAYER_DOWN = 's';
const KEY_RIGHT_PLAYER_UP = 'ArrowUp';
const KEY_RIGHT_PLAYER_DOWN = 'ArrowDown';
const KEY_ENTER = 'Enter';

const RACKET_WIDTH = 0.02;
const RACKET_HEIGHT = 0.25;
const BALL_DIAMETER = 0.1;
const INITIAL_BALL_MIN_VELOCITY = 7;
const INITIAL_BALL_MAX_VELOCITY = 15;
const BALL_VELOCITY_INCREASE_ON_BOUNCE = 1.01;
const SCORE_LIMIT = 50;
const RACKET_ACCELERATION = 5;
const RACKET_DECLERATION = 0.9;

const FFT_BIN_COUNT = 1024;
const FFT_SMOOTHING = 0.6; 

const LOUD_NOISE_THRESHOLD = 0.05; 
const HURT_COOLDOWN = 120; 


var canvas;
var currentState;
var scoreTimeout;
var leftRacket = {
    x: 0,
    y: 0,
    yVelocity: 0,
    width: 0,
    height: 0
}
var rightRacket = {
    x: 0,
    y: 0,
    yVelocity: 0,
    width: 0,
    height: 0
}

var balls = [];

var score = {
    left: 0,
    right: 0
}

var mic = null;
var fft = null; 
var analyzer = null; 
var currentRotation = 0;

var eyeballImage;
var introVideoElement;

var bunnyClosedImage;
var bunnyOpenImage;
var currentBunnyImage;
var imageSwitchRate = 7; 

var bunnyDeath1Image;
var bunnyDeath2Image;
var queenGameOverImage;

var bunnyHurtStage = 0;
var bunnyHurtLockoutTimer = 0;


const PRE_VIDEO_PHRASES = [
    "You hear a knock on the door.",
    "Who could it be? It's midnight...",
    "You decide to open the door."
];
var preVideoDialogueState = {
    currentPhraseIndex: 0,
    currentTextIndex: 0,
    textDisplayedFully: false,
    lastTextIndexDrawn: 0,
};

const DIALOGUE_PHRASES = [
    "I told you time is up. Why don't you listen? Time is ticking! The queen is coming... Wait, Alice! Who is this next to you?",
    "That doesn't matter. Listen to me. You have to be as quiet as a mouse, and you need to win. If you do not win, I cannot help you anymore. The queen is coming. Collect 50 eyes to escape!",
    "If you are Alice, you will use 'up/down'. If not my Alice, you will use 'w/s'."
];
var currentDialogueIndex = 0;
var currentTextIndex = 0;
var textSpeed = 1; 
var textDisplayedFully = false;
var lastTextIndexDrawn = 0;

const SCORE_DIALOGUE_PHRASES = [
    "Keep going!",
    "Make sure to be quiet! Why did you stop!",
    "I can trust you, right? You won't leave us behind?",
    "I always knew you were special, Alice.",
    "We did it! Well thanks to you of course."
];

const BUNNY_HURT_PHRASES = [
    "Alice, it hurts. Who is playing with you?",
    "Please, Alice... She's hurting me.",
    "The bunny is gone."
];
var bunnyDialogueState = {
    currentPhraseIndex: 0,
    currentTextIndex: 0,
    textDisplayedFully: false,
    lastTextIndexDrawn: 0,
};


var scoreDialogueState = {
    currentPhraseIndex: 0,
    currentTextIndex: 0,
    textDisplayedFully: false,
    lastTextIndexDrawn: 0,
    isActive: false
};

var dialogueRoundCounter = 0;

var visualizerGif;


function preload() {
    const cacheBuster = Date.now(); 
    eyeballImage = loadImage('img/eyeball.png?' + cacheBuster);
    bunnyClosedImage = loadImage('img/Bunny1.png?' + cacheBuster);
    bunnyOpenImage = loadImage('img/Bunny2.png?' + cacheBuster);
    currentBunnyImage = bunnyClosedImage;
    
    visualizerGif = loadImage('img/Heights.gif?' + cacheBuster);

    bunnyDeath1Image = loadImage('img/BunnyDead1.png?' + cacheBuster);
    bunnyDeath2Image = loadImage('img/BunnyDead2.png?' + cacheBuster);
    queenGameOverImage = loadImage('img/OpenMouthQueen.png?' + cacheBuster);
}

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    
    
    colorMode(RGB, 255, 255, 255);

    canvas.mousePressed(toggleSound);
    background(0);
    textSize(50);
    noStroke();
    resetGameObjects();
    
    currentState = STATE_PRE_VIDEO_DIALOGUE;
    
    introVideoElement = document.getElementById('introVideo');
    if (introVideoElement) {
        introVideoElement.addEventListener('ended', transitionToDialogueFromVideo);
    } else {
        currentState = STATE_DIALOGUE;
    }
}

function draw() {
    
    switch (currentState) {
        case STATE_PRE_VIDEO_DIALOGUE:
            drawForPreVideoDialogue();
            break;
        case STATE_INTRO_VIDEO:
            drawForIntroVideo();
            break;
        case STATE_DIALOGUE:
            drawForDialogue();
            break;
        case STATE_WELCOME:
            drawForWelcome();
            break;
        case STATE_PLAYING:
            drawForPlaying();
            break;
        case STATE_SCORE:
            drawForScore();
            break;
        case STATE_WINNER:
            drawForWinning();
            break;
        case STATE_BUNNY_HURT:
            drawForBunnyHurt();
            break;
        default:
            throw new Error(`Unrecognized state: ${currentState}`);
    }
}

function keyPressed() {
    if (key === KEY_ENTER) {
        if (currentState === STATE_SCORE) {

        } else if (currentState === STATE_BUNNY_HURT) {
            handleBunnyHurtInput();
        } else if (currentState === STATE_WELCOME) {
             transitionToPlaying();
        }

    }
    

    if (key === KEY_SPACE) {
        if (currentState === STATE_PRE_VIDEO_DIALOGUE) {
            handlePreVideoDialogueInput();
        } else if (currentState === STATE_DIALOGUE) {
            handleIntroDialogueInput();
        } else if (currentState === STATE_SCORE) {
            handleScoreDialogueInput();
        } else if (currentState === STATE_BUNNY_HURT) {
            handleBunnyHurtInput();
        }
    }
    
    if (key === KEY_ESCAPE && currentState === STATE_PLAYING) {
        transitionToWelcome();
    }
    
    if (key === '1' && currentState === STATE_PLAYING) {
        transitionToScore();
    }
}

function handlePreVideoDialogueInput() {
    if (preVideoDialogueState.textDisplayedFully) {
        preVideoDialogueState.currentPhraseIndex++;
        if (preVideoDialogueState.currentPhraseIndex >= PRE_VIDEO_PHRASES.length) {
            transitionToVideoFromPreDialogue();
        } else {
            preVideoDialogueState.currentTextIndex = 0;
            preVideoDialogueState.textDisplayedFully = false;
        }
    } else {
        preVideoDialogueState.currentTextIndex = PRE_VIDEO_PHRASES[preVideoDialogueState.currentPhraseIndex].length;
        preVideoDialogueState.textDisplayedFully = true;
    }
}

function handleIntroDialogueInput() {
    if (textDisplayedFully) {
        currentDialogueIndex++;
        if (currentDialogueIndex >= DIALOGUE_PHRASES.length) {
            transitionToWelcomeFromDialogue();
        } else {
            currentTextIndex = 0;
            textDisplayedFully = false;
        }
    } else {
        currentTextIndex = DIALOGUE_PHRASES[currentDialogueIndex].length;
        textDisplayedFully = true;
        currentBunnyImage = bunnyClosedImage;
    }
}

function handleScoreDialogueInput() {
    if (scoreDialogueState.textDisplayedFully) {
        transitionToPlayingFromScoreDialogue();
    } else {
        const currentPhrase = SCORE_DIALOGUE_PHRASES[scoreDialogueState.currentPhraseIndex];
        scoreDialogueState.currentTextIndex = currentPhrase.length;
        scoreDialogueState.textDisplayedFully = true;
        currentBunnyImage = bunnyClosedImage;
    }
}

function handleBunnyHurtInput() {
    if (bunnyDialogueState.textDisplayedFully) {
        if (bunnyHurtStage >= BUNNY_HURT_PHRASES.length) { 
            resetScore();
            bunnyHurtStage = 0;
            transitionToWelcome();
        } else {
            transitionToPlaying();
        }
    } else {
        const currentPhrase = BUNNY_HURT_PHRASES[bunnyHurtStage - 1];
        bunnyDialogueState.currentTextIndex = currentPhrase.length;
        bunnyDialogueState.textDisplayedFully = true;
        currentBunnyImage = getBunnyHurtImage();
    }
}


function drawForIntroVideo() {
    
}

function drawForPreVideoDialogue() {
    drawDialogueBox(PRE_VIDEO_PHRASES, 
                    preVideoDialogueState.currentPhraseIndex, 
                    preVideoDialogueState.currentTextIndex, 
                    preVideoDialogueState.textDisplayedFully, 
                    (newIndex, fullyDisplayed) => {
                        preVideoDialogueState.currentTextIndex = newIndex;
                        preVideoDialogueState.textDisplayedFully = fullyDisplayed;
                    },
                    null
                    );
}

function drawForDialogue() {
    drawDialogueBox(DIALOGUE_PHRASES, 
                    currentDialogueIndex, 
                    currentTextIndex, 
                    textDisplayedFully, 
                    (newIndex, fullyDisplayed) => {
                        currentTextIndex = newIndex;
                        textDisplayedFully = fullyDisplayed;
                    });
}

function drawForScore() {
    drawDialogueBox(SCORE_DIALOGUE_PHRASES, 
                    scoreDialogueState.currentPhraseIndex, 
                    scoreDialogueState.currentTextIndex, 
                    scoreDialogueState.textDisplayedFully, 
                    (newIndex, fullyDisplayed) => {
                        scoreDialogueState.currentTextIndex = newIndex;
                        scoreDialogueState.textDisplayedFully = fullyDisplayed;
                    });
    
    fill(255); 
    textSize(32);
    textFont('Garamond, serif'); 
    textAlign(CENTER, TOP);
    text(`Score: ${score.left} : ${score.right}`, width / 2, 40);
}

function drawForBunnyHurt() {
    
    let currentDialogueIndex = bunnyHurtStage - 1;
    let bunnyImage = getBunnyHurtImage();

    if (bunnyHurtStage >= BUNNY_HURT_PHRASES.length) {
        
        let shakeAmount = 0;
        if(getAudioContext().state == 'running' && analyzer != null) {
            const amplitude = analyzer.getLevel();
            shakeAmount = map(amplitude, 0, LOUD_NOISE_THRESHOLD, 0, 30, true); 
        }

        push();
        translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));

        if (queenGameOverImage) {
            image(queenGameOverImage, 0, 0, width, height);
        }
        
    } else {
    }

    drawDialogueBox(BUNNY_HURT_PHRASES, 
                    currentDialogueIndex, 
                    bunnyDialogueState.currentTextIndex, 
                    bunnyDialogueState.textDisplayedFully, 
                    (newIndex, fullyDisplayed) => {
                        bunnyDialogueState.currentTextIndex = newIndex;
                        bunnyDialogueState.textDisplayedFully = fullyDisplayed;
                    }, 
                    bunnyImage
    );

    if (bunnyHurtStage < BUNNY_HURT_PHRASES.length && bunnyDialogueState.textDisplayedFully) {
        textSize(16);
        textAlign(CENTER, BOTTOM);
        textFont('Garamond, serif'); 
        fill(255, 200, 0); 
        
        text("Press SPACE to continue...", width / 2, height - 20);
    }
    
    if (bunnyHurtStage >= BUNNY_HURT_PHRASES.length) {
        
        noStroke(); 
        fill(255, 0, 0); 
        textSize(100); 
        textFont('Garamond, serif'); 
        textAlign(CENTER, CENTER);
        
        const gameOverY = height / 2; 
        
        text("GAME OVER", width / 2, gameOverY);


        textSize(16);
        textAlign(CENTER, BOTTOM);
        textFont('Garamond, serif'); 
        fill(255, 200, 0); 
        
        text("Press ENTER to restart game...", width / 2, height - 20);
        
        pop();
    }
}


function drawDialogueBox(phrases, phraseIndex, textIndex, fullyDisplayed, updateStateCallback, bunnyOverrideImage = null) {
    if (currentState !== STATE_BUNNY_HURT || bunnyHurtStage < BUNNY_HURT_PHRASES.length) {
        background(0);
    }
    
    if (phraseIndex >= phrases.length) {
        return;
    }

    const currentPhrase = phrases[phraseIndex];
    
    let activeImage = bunnyOverrideImage;

    if (!fullyDisplayed) {
        let newTextIndex = textIndex;
        
        if (frameCount % textSpeed === 0) { 
            newTextIndex++;
        }
        
        if (newTextIndex >= currentPhrase.length) {
            newTextIndex = currentPhrase.length;
            updateStateCallback(newTextIndex, true);
            if (activeImage === bunnyOpenImage || activeImage === bunnyClosedImage) activeImage = bunnyClosedImage;
        } else {
            updateStateCallback(newTextIndex, false);
        }

        if (bunnyOverrideImage === null && currentState === STATE_DIALOGUE) {
            if (newTextIndex > lastTextIndexDrawn) {
                if ((newTextIndex - 1) % imageSwitchRate === 0) {
                    if (currentBunnyImage === bunnyClosedImage) {
                        currentBunnyImage = bunnyOpenImage;
                    } else {
                        currentBunnyImage = bunnyClosedImage;
                    }
                }
            }
            lastTextIndexDrawn = newTextIndex; 
            activeImage = currentBunnyImage;
        }

    } else {
        if (activeImage === bunnyOpenImage || activeImage === bunnyClosedImage) activeImage = bunnyClosedImage;
    }
    
    if (bunnyOverrideImage === null && currentState !== STATE_BUNNY_HURT && currentState !== STATE_PRE_VIDEO_DIALOGUE) {
        activeImage = currentBunnyImage;
    } else if (bunnyOverrideImage !== undefined && bunnyOverrideImage === null) {
        activeImage = null;
    }
    
    const displayedText = currentPhrase.substring(0, textIndex);
    
    const boxPadding = 40;
    const textBoxWidth = width * 0.9;
    
    const desiredBoxHeight = height / 4; 
    
    const boxX = width * 0.05;
    const boxY = height - desiredBoxHeight - 10; 
    const boxHeight = desiredBoxHeight;
    const textDrawingHeight = boxHeight - (boxPadding * 2);

    textSize(32);
    textFont('Garamond, serif');
    textAlign(LEFT, TOP);

    stroke(255);
    strokeWeight(4);
    noFill();
    rect(boxX, boxY, textBoxWidth, boxHeight);

    if (currentState !== STATE_BUNNY_HURT || bunnyHurtStage < BUNNY_HURT_PHRASES.length) {
        noStroke();
        fill(0);
        rect(boxX, boxY, textBoxWidth, boxHeight);
    }
    
    fill(255);
    
    text(displayedText, boxX + boxPadding, boxY + boxPadding, textBoxWidth - (boxPadding * 2), textDrawingHeight);
    
    const bunnySize = 500;
    
    const bunnyX = boxX; 
    
    const bunnyY = boxY - bunnySize + 10; 
    
    if (activeImage) { 
        image(activeImage, bunnyX, bunnyY, bunnySize, bunnySize);
    }
    
    if (fullyDisplayed && currentState !== STATE_BUNNY_HURT) {
        
        let promptKey = (currentState === STATE_DIALOGUE || currentState === STATE_SCORE || currentState === STATE_PRE_VIDEO_DIALOGUE) ? "SPACE" : "ENTER";

        textSize(16);
        textAlign(CENTER, BOTTOM);
        fill(255, 200, 0); 
        textFont('Garamond, serif');
        text(`Press ${promptKey} to continue...`, width / 2, boxY + boxHeight - 10);
    }
}

function drawForWelcome() {
    
    
    background(0, 50); 
    
    let mappedVolume = 0;

    if(getAudioContext().state == 'running' && fft != null && analyzer != null) {
        
        const amplitude = analyzer.getLevel();
        
        mappedVolume = map(amplitude, 0, 0.2, 0, 1, true); 
        
        const minScale = 1.0;
        const maxScale = 5;
        const zoomScale = map(mappedVolume, 0, 1, minScale, maxScale);
        
        const verticalShift = height * 0.15;

        if (visualizerGif) {
            push();
            translate(width / 2, height / 2 + verticalShift); 
            scale(zoomScale);
            image(visualizerGif, -width / 2, -height / 2, width, height);
            pop();
        }
        
    } else {
        if (visualizerGif) {
            tint(255, 100); 
            image(visualizerGif, 0, 0, width, height);
            noTint();
        }
    }
    
    fill(255, 200, 0); 
    textAlign(CENTER, BOTTOM);
    textSize(16);
    textFont('Garamond, serif'); 
    text('Click to enable sound, then press ENTER to start Pong!', width / 2, height - 20);
}


function drawForPlaying() {
    
    if (bunnyHurtLockoutTimer > 0) {
        bunnyHurtLockoutTimer--;
    }
    
    background(0, 50); 
    
    let mappedVolume = 0;
    let offsetX = 0; 
    let offsetY = 0; 

    
    if(getAudioContext().state == 'running' && fft != null && analyzer != null) {
        
        const amplitude = analyzer.getLevel();
        mappedVolume = map(amplitude, 0, 0.2, 0, 1, true); 
        
        if (amplitude > LOUD_NOISE_THRESHOLD && bunnyHurtLockoutTimer === 0 && bunnyHurtStage < 3) {
            bunnyHurtStage++;
            transitionToBunnyHurt();
            bunnyHurtLockoutTimer = HURT_COOLDOWN;
            return;
        }

        const minScale = 1.0;
        const maxScale = 5;
        const zoomScale = map(mappedVolume, 0, 1, minScale, maxScale);
        
        const ballDisplacementX = balls[0] ? balls[0].x - width / 2 : 0;
        const ballDisplacementY = balls[0] ? balls[0].y - height / 2 : 0;
        
        
        const trackingStrength = 0.1; 
        offsetX = ballDisplacementX * trackingStrength * mappedVolume;
        offsetY = ballDisplacementY * trackingStrength * mappedVolume;
        
        const verticalShift = height * 0.15;
        
        push();
        
        translate(width / 2, height / 2 + verticalShift); 
        
        scale(zoomScale); 
        
        translate(offsetX / zoomScale, offsetY / zoomScale);

        image(visualizerGif, -width / 2, -height / 2, width, height);
        
        pop();
        
    } else {
        tint(255, 150);
        image(visualizerGif, 0, 0, width, height);
        noTint();
    }
    
    const minBrightness = 150; 
    const pulsingBrightness = map(mappedVolume, 0, 0.2, minBrightness, 255); 
    
    
    fill(255); 
    
    textSize(32);
    textAlign(CENTER, TOP);
    textFont('Garamond, serif'); 
    text(`${score.left} : ${score.right}`, width / 2, 40);
    
    
    fill(pulsingBrightness); 
    

    
    var leftPlayerInput = 0;
    var rightPlayerInput = 0;
    
    if (keyIsDown(KEY_LEFT_PLAYER_UP.toUpperCase().charCodeAt(0))) { 
        leftPlayerInput = -1;
    }
    if (keyIsDown(KEY_LEFT_PLAYER_DOWN.toUpperCase().charCodeAt(0))) { 
        leftPlayerInput = +1;
    }

    if (keyIsDown(UP_ARROW)) {
        rightPlayerInput = -1;
    } 
    if (keyIsDown(DOWN_ARROW)) {
        rightPlayerInput = +1;
    }
    

    if(leftPlayerInput != 0) {
    leftRacket.yVelocity += RACKET_ACCELERATION * leftPlayerInput;
    } else {
        leftRacket.yVelocity *= RACKET_DECLERATION;
    }
     if(rightPlayerInput != 0) {
    rightRacket.yVelocity += RACKET_ACCELERATION * rightPlayerInput;
    } else {
        rightRacket.yVelocity *= RACKET_DECLERATION;
    }

    leftRacket.y += leftRacket.yVelocity;
    rightRacket.y += rightRacket.yVelocity;
    
    if(leftRacket.y < 0) {
        leftRacket.y = 0;
        leftRacket.yVelocity *= -.1;
    } else if(leftRacket.y + leftRacket.height > height) {
        leftRacket.y = height - leftRacket.height;
        leftRacket.yVelocity *= -.1;
    }

    if(rightRacket.y < 0) {
        rightRacket.y = 0;
        rightRacket.yVelocity *= -.1;
    } else if(rightRacket.y + rightRacket.height > height) {
        rightRacket.y = height - rightRacket.height;
        rightRacket.yVelocity *= -.1;
    }

    rect(leftRacket.x, leftRacket.y, leftRacket.width, leftRacket.height);
    rect(rightRacket.x, rightRacket.y, rightRacket.width, rightRacket.height);
    
    for (let i = 0; i < balls.length; i++) {
        var ball = balls[i];
        var ballLeftX = ball.x - ball.diameter * 0.5;
        var ballTopY = ball.y - ball.diameter * 0.5;
        var ballRightX = ball.x + ball.diameter * 0.5;
        var ballBottomY = ball.y + ball.diameter * 0.5;
        
        image(eyeballImage, ball.x - ball.diameter * 0.5, ball.y - ball.diameter * 0.5, ball.diameter, ball.diameter);

        if (ballLeftX <= 0) {
            score.right++;
            balls.splice(i, 1);
            i--;
            continue;
        }
        else if (ballRightX >= width) {
            score.left++;
            balls.splice(i, 1);
            i--;
            continue;
        }

        if (ballTopY <= 0 || ballBottomY >= height) {
            ball.yVelocity *= -1;
            if(ballTopY <= 0) ball.y = ball.diameter * 0.5;
            if(ballBottomY >= height) ball.y = height - ball.diameter * 0.5;
        }

        if(ballLeftX <= leftRacket.x + leftRacket.width &&
            ballBottomY >= leftRacket.y &&
            ballTopY <= leftRacket.y + leftRacket.height &&
            ball.xVelocity < 0) {
                ball.xVelocity *= -1;
                increaseBallVelocityOnBounce(ball);
        }

        if(ballRightX >= rightRacket.x &&
            ballBottomY >= rightRacket.y &&
            ballTopY <= rightRacket.y + rightRacket.height &&
            ball.xVelocity > 0
        ) {
            ball.xVelocity *= -1;
            increaseBallVelocityOnBounce(ball);
        }


        ball.x += ball.xVelocity;
        ball.y += ball.yVelocity;
    }

    if (balls.length === 0) {
        gotoScoreOrWinner();
    }


    if (keyIsPressed && key === KEY_ESCAPE) {
        transitionToWelcome();
    }
    if (keyIsPressed && key === '1') {
        transitionToScore();
    }
}

function drawForWinning() {
    background(0);
    fill(255); 

    
    textAlign(CENTER, CENTER);
    textSize(50); 
    textFont('Garamond, serif'); 
    const winnerText = 
        score.left > score.right 
            ? "The winner is Alice's friend!\nPress ESCAPE to play again." 
            : "The winner is Alice!!\nPress ESCAPE to play again.";

    text(winnerText, width / 2, height / 2);

    if (keyIsDown(27)) { 
      resetScore();
      transitionToWelcome();
    }

}

function transitionToVideoFromPreDialogue() {
    if (introVideoElement) {
        introVideoElement.classList.remove('hidden'); 
        introVideoElement.play().catch(error => {
            console.log('Autoplay failed after dialogue, attempting transition to next stage:', error);
            transitionToDialogueFromVideo(); 
        });
        currentState = STATE_INTRO_VIDEO;
    } else {
        transitionToDialogueFromVideo();
    }
}

function transitionToDialogueFromVideo() {
    if (introVideoElement) {
        introVideoElement.classList.add('hidden'); 
        introVideoElement.pause();
        introVideoElement.currentTime = 0; 
    }
    currentState = STATE_DIALOGUE;
    currentDialogueIndex = 0;
    currentTextIndex = 0;
    textDisplayedFully = false;
    lastTextIndexDrawn = 0;
    currentBunnyImage = bunnyClosedImage;
    resetGameObjects();
    if (scoreTimeout) {
        clearTimeout(scoreTimeout);
        scoreTimeout = null;
    }
}

function transitionToWelcomeFromDialogue() {
    currentState = STATE_WELCOME;
    resetGameObjects(); 
}

function transitionToWelcome() {
    currentState = STATE_WELCOME;
    resetGameObjects();
    if (scoreTimeout) {
        clearTimeout(scoreTimeout);
        scoreTimeout = null;
    }
}

function transitionToPlaying() {
    currentState = STATE_PLAYING;
    bunnyDialogueState.currentTextIndex = 0;
    bunnyDialogueState.textDisplayedFully = false;
    bunnyDialogueState.lastTextIndexDrawn = 0;
}

function transitionToWinner() {
    currentState = STATE_WINNER;
}

function transitionToBunnyHurt() {
    currentState = STATE_BUNNY_HURT;

    bunnyDialogueState.currentTextIndex = 0;
    bunnyDialogueState.textDisplayedFully = false;
    bunnyDialogueState.lastTextIndexDrawn = 0;

}

function getBunnyHurtImage() {
    if (bunnyHurtStage === 1) {
        return bunnyDeath1Image;
    } else if (bunnyHurtStage === 2) {
        return bunnyDeath2Image;
    } else if (bunnyHurtStage >= 3) {
        return null; 
    }
    return currentBunnyImage;
}


function transitionToScore() {
    currentState = STATE_SCORE;
    
    dialogueRoundCounter++;
    
    const scoreDialogueIndex = (dialogueRoundCounter - 1) % SCORE_DIALOGUE_PHRASES.length;

    scoreDialogueState.currentPhraseIndex = scoreDialogueIndex;
    scoreDialogueState.currentTextIndex = 0;
    scoreDialogueState.textDisplayedFully = false;
    scoreDialogueState.lastTextIndexDrawn = 0;
    
    if (scoreTimeout) {
        clearTimeout(scoreTimeout);
        scoreTimeout = null;
    }

    resetGameObjects(); 
}

function transitionToPlayingFromScoreDialogue() {
    currentState = STATE_PLAYING;
}

function gotoScoreOrWinner() {
    if(score.left >= SCORE_LIMIT || score.right >= SCORE_LIMIT) {
        transitionToWinner();
    } else {
        transitionToScore();
    }
}


function resetScore() {
  score.left = 0;
  score.right = 0;
  dialogueRoundCounter = 0;
}

function handleScoreTimeout() {
    transitionToPlaying();
    clearTimeout(scoreTimeout);
    scoreTimeout = null;
    resetGameObjects();
}

function resetGameObjects() {
    leftRacket.x = 0;
    leftRacket.width = windowWidth * RACKET_WIDTH;
    leftRacket.height = windowHeight * RACKET_HEIGHT;
    leftRacket.y = windowHeight / 2 - leftRacket.height / 2;
    leftRacket.yVelocity = 0;

    rightRacket.width = windowWidth * RACKET_WIDTH;
    rightRacket.x = windowWidth - rightRacket.width;
    rightRacket.height = windowHeight * RACKET_HEIGHT;
    rightRacket.y = windowHeight / 2 - rightRacket.height / 2;
    rightRacket.yVelocity = 0;

    balls = [];
    for (let i = 0; i < 10; i++) {
        var newBall = {
            x: windowWidth / 2,
            y: windowHeight / 2,
            xVelocity: 0,
            yVelocity: 0,
            diameter: windowHeight * BALL_DIAMETER
        };
        
        var initialXSpeed = random(INITIAL_BALL_MIN_VELOCITY, INITIAL_BALL_MAX_VELOCITY);
        newBall.xVelocity = initialXSpeed * randomSign();
        newBall.yVelocity = initialXSpeed * 0.5 * randomSign();
        balls.push(newBall);
    }
}

function randomSign() {
    var result = 1;
    if (Math.random() > 0.5) {
        result = -1
    }
    return result;
}


function increaseBallVelocityOnBounce(ball) {
    const multiplier = BALL_VELOCITY_INCREASE_ON_BOUNCE;
    
    ball.xVelocity = Math.abs(ball.xVelocity) * multiplier * Math.sign(ball.xVelocity);
    ball.yVelocity = Math.abs(ball.yVelocity) * multiplier * Math.sign(ball.yVelocity);
}

function toggleSound() {
  console.log('toggleSound');
  
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
  
  if (mic === null) {
      mic = new p5.AudioIn(); 
      mic.start();
      
  } else if (fft === null) {
      if (mic.enabled === false) {
        mic.start();
      }
      
      fft = new p5.FFT(FFT_SMOOTHING, FFT_BIN_COUNT);
      fft.setInput(mic);
      
      analyzer = new p5.Amplitude(); 
      analyzer.setInput(mic);
      
  } else if (mic.enabled === false) {
      mic.start();
  }
}
