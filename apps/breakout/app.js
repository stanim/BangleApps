// Bangle.js Breakout Game
/*jslint bitwise:true, for:true, white:true*/
/*global Bangle,BTN1,BTN3,clearInterval,E,g,require,setInterval,setWatch*/
const degrees = Math.PI / 180;
const degrees90 = Math.PI / 2;
const sqrt2 = Math.sqrt(2);

const angleMax = 75 * degrees;
const bgColor = "#000";
const levelMax = 50;
const timeout = 1e3 / 30; // max 50pfs

let buzzing = true;
let clock;
let clockString = "Clock";
let interval;
let scoreHighest = 0;
let screen = { height: g.getHeight(), width: g.getWidth() };
screen.width2 = screen.width >> 1;
screen.height2 = screen.height >> 1;

const fontSize = (screen.width / 10) | 0; // max 10 lines
// const line1 = screen.height2 - 3 * fontSize;
// const line2 = screen.height2 - 1.5 * fontSize;
const line3 = screen.height2;
const line4 = screen.height2 + 1.5 * fontSize;
const line5 = screen.height2 + 3 * fontSize;
const line6 = screen.height2 + 4.5 * fontSize;
const rowsHeight = (line4 - fontSize) | 0;
const rowsMax = rowsHeight >> 1;

const settingsFile = "breakout.settings.json";

// prettier-ignore
let settings = Object.assign( // NOSONAR
  {
    level: 1,
    levelHighest: 1,
    levelSave: true,
    scoreHighest: 0
  },
  require("Storage").readJSON(settingsFile, true) || {}
);
function writeSettings(game) {
  let changes = [];
  if (settings.levelSave && settings.level !== game.level) {
    settings.level = game.level;
    changes.push("level");
  }
  if (settings.levelHighest < game.level) {
    settings.levelHighest = game.level;
    changes.push("score");
  }
  if (settings.scoreHighest < game.score) {
    settings.scoreHighest = game.score;
    changes.push("levelHighest");
  }
  if (changes.length) {
    require("Storage").writeJSON(settingsFile, settings);
  }
  return settings;
}

let game = { level: settings.level, score: 0 };

function getTime() {
  const dateObj = new Date();
  return (
    String("0" + dateObj.getHours()).slice(-2) +
    ":" +
    String("0" + dateObj.getMinutes()).slice(-2)
  );
}

function createLevel(level) {
  const c = Math.ceil(level / 2) + 3;
  const r = Math.min(Math.floor(level / 2) + 1, rowsMax);
  const w = screen.width / c;
  const h = Math.min(rowsHeight / r, w >> 1);
  return {
    columns: c,
    height: h,
    lowest: h * r,
    random: Math.min(0.2 + level / 10, 0.9),
    rows: r,
    speed: Math.min((level >> 3) + 4, 8),
    width: w
  };
}

function startClock() {
  drawClock();
  clock = setInterval(drawClock, 60000);
}

function stopClock() {
  if (clock) {
    clearInterval(clock);
    clock = undefined;
    clearString(clockString, line5);
  }
}

function drawClock() {
  clearString(clockString, line5);
  clockString = getTime();
  g.setColor(randomColor());
  g.drawString(clockString, screen.width2, line5);
}

function randomColor() {
  // Random color in #RGB format
  return (
    "#" + ("00" + Number((4096 * Math.random()) | 0).toString(16)).slice(-3)
  );
}

function buzz(time) {
  if (buzzing) {
    Bangle.buzz(time);
  }
}

function clearScreen() {
  g.setBgColor(bgColor);
  g.clear();
  g.setFont("6x8", fontSize / 8);
  g.setFontAlign(0, 1, 0);
}

function clearString(text, y) {
  const width = Math.ceil(g.stringWidth(text) >> 1);
  g.setColor(bgColor);
  g.fillRect(screen.width2 - width, y - fontSize, screen.width2 + width, y);
}

function drawBall(ball, color) {
  g.setColor(color);
  g.drawRect(ball.cx - 2, ball.cy - 2, ball.cx + 2, ball.cy + 2);
}

function drawPaddle(paddle, color) {
  g.setColor(color);
  g.fillRect(
    paddle.cx - paddle.width2,
    paddle.y,
    paddle.cx + paddle.width2,
    paddle.y + paddle.height
  );
}

function drawBricks(level) {
  let bricks = {};
  let i;
  let j;
  for (i = 0; i < level.rows; i += 1) {
    let row = {}; // do not allow empty rows
    while (Object.keys(row).length === 0) {
      for (j = 0; j < level.columns; j += 1) {
        if (Math.random() < level.random) {
          // register brick
          row[j] = true;
          // draw brick
          const x = j * level.width;
          const y = i * level.height;
          g.setColor(randomColor());
          g.fillRect(x, y, x + level.width, y + level.height);
        }
      }
    }
    bricks[i] = row;
  }
  return bricks;
}

function movePaddle(paddle, dir) {
  drawPaddle(paddle, bgColor);
  if (dir < -0.3) {
    paddle.cx = Math.min(screen.width - paddle.width2, paddle.cx - dir);
  } else if (dir > 0.3) {
    paddle.cx = Math.max(paddle.width2, paddle.cx - dir);
  }
  drawPaddle(paddle, paddle.color);
}

function hitBrick(ball, bricks, level) {
  let callback;
  // hit a brick?
  const i = (ball.cy / level.height) | 0;
  const j = (ball.cx / level.width) | 0;
  let row = bricks[i];
  if (row && row[j]) {
    // bounce ball
    ball.vy = -ball.vy;
    ball.cy = (i + 1) * level.height;
    // update score
    clearString(String(game.score), line5);
    game.score += 1;
    g.setColor("#222");
    g.drawString(game.score, screen.width2, line5);
    // delete brick from row
    delete row[j];
    if (Object.keys(row).length === 0) {
      delete bricks[i];
    }
    // erase brick on screen
    g.setColor(bgColor);
    g.fillRect(
      j * level.width,
      i * level.height,
      (j + 1) * level.width,
      ball.cy
    );
    // no bricks left?
    if (Object.keys(bricks).length === 0) {
      g.setColor("#0F0");
      g.drawString("You won!", screen.width2, line4);
      g.setColor("#333");
      g.drawString("Press button", screen.width2, line6);
      game.level += 1;
      writeSettings(game);
      callback = function (dir) {
        if (!dir) {
          showLevel(game);
        }
      };
    }
    buzz(25);
  }
  return callback;
}

function hitPaddle(ball, paddle, level) {
  // hit the paddle ?
  const dx = Math.abs(ball.cx - paddle.cx);
  if (dx < paddle.width2) {
    const angle = degrees90 + (dx / paddle.width2) * angleMax;
    const vx = level.speed * Math.cos(angle);
    if (ball.vx < 0) {
      ball.vx = vx;
    } else {
      ball.vx = -vx;
    }
    ball.vy = level.speed * -Math.sin(angle);
    ball.cy = ball.yMin;
    buzz(25);
  }
}

function update(ball, paddle, bricks, level, game) {
  // prettier-ignore
  const prevBall = Object.assign({}, ball); // NOSONAR
  let callback;
  // move paddle with accelerometer
  movePaddle(paddle, Bangle.getAccel().x * 32);

  // move ball
  ball.cx += ball.vx;
  ball.cy += ball.vy;

  // check if ball hits something
  if (ball.cx < 0) {
    // left edge
    ball.vx = -ball.vx;
    ball.cx = 0;
  } else if (ball.cx > screen.width) {
    // right edge
    ball.vx = -ball.vx;
    ball.cx = screen.width;
  } else if (ball.cy < 0) {
    // top edge
    ball.vy = -ball.vy;
    ball.cy = 0;
  } else if (ball.cy < level.lowest) {
    // any brick
    callback = hitBrick(ball, bricks, level);
  } else if (ball.cy > screen.height) {
    // bottom edge -> game over
    g.setColor(randomColor());
    g.drawString("Level " + game.level, screen.width2, line4);
    g.setColor("#F00");
    g.drawString("Game Over", screen.width2, line6);
    writeSettings(game);
    callback = function (dir) {
      if (!dir) {
        playGame(game);
      }
    };
  } else if (ball.cy > ball.yMin) {
    // paddle
    hitPaddle(ball, paddle, level);
  }
  if (callback) {
    drawPaddle(paddle, bgColor);
    g.setColor(randomColor());
    g.drawString(game.score, screen.width2, line5);
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }
    Bangle.setUI({ mode: "leftright" }, callback);
    buzz(100);
  }

  drawBall(prevBall, bgColor);
  drawBall(ball, ball.color);
  Bangle.setLCDPower(1);
}

function playLevel(game) {
  const level = createLevel(game.level);
  let paddle = {
    color: "#0389f9",
    cx: screen.width2,
    height: 4,
    speed: screen.width / 12,
    width: screen.width >> 2,
    width2: screen.width >> 3,
    y: screen.height - 4
  };

  let ball = {
    color: "#FF0",
    cx: screen.width2,
    cy: paddle.y - 3,
    vx: level.speed / sqrt2, // horizontal velocity
    vy: -level.speed / sqrt2, // vertical velocity
    yMin: paddle.y - 3
  };

  // Input for Bangle.js 1
  Bangle.setUI({ mode: "leftright" }, function (dir) {
    if (dir) {
      if (!interval) {
        if (dir < 0) {
          // switch buzz on/off
          buzzing = !buzzing;
          buzz(100);
        } else if (clock) {
          stopClock();
        } else {
          startClock();
        }
      }
    } else if (interval) {
      // pause game (middle button)
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
      g.setColor(randomColor());
      g.drawString("Level " + game.level, screen.width2, line4);
      g.setColor("#FF0");
      g.drawString("Pause", screen.width2, line6);
      startClock();
    } else {
      // resume game (middle button)
      stopClock();
      interval = setInterval(
        update,
        timeout,
        ball,
        paddle,
        bricks,
        level,
        game
      );
      clearString("Level " + game.level, line4);
      clearString("Pause", line6);
    }
  });

  // Initialize
  clearScreen();
  drawPaddle(paddle, paddle.color);
  let bricks = drawBricks(level);
  stopClock();
  interval = setInterval(update, timeout, ball, paddle, bricks, level, game);
}

function showLevel(game) {
  clearScreen();
  g.setColor(randomColor());
  g.drawString("Break Out!", screen.width2, line3);
  g.setColor("#333");
  g.drawString("Press button", screen.width2, line6);
  if (game.score > 0) {
    g.setColor(randomColor());
    g.drawString(game.score, screen.width2, line5);
  }
  if (game.level > levelMax) {
    game.level = levelMax;
    writeSettings(game);
    g.setColor(randomColor());
    g.drawString("The End!", screen.width2, line4);
    Bangle.setUI({ mode: "leftright" }, function (dir) {
      if (!dir) {
        playGame(game);
      }
    });
  } else {
    g.setColor(randomColor());
    g.drawString("Level " + game.level, screen.width2, line4);
    Bangle.setUI({ mode: "leftright" }, function (dir) {
      if (!dir) {
        playLevel(game);
      }
    });
  }
}

function playGame(game) {
  game.score = 0;
  showLevel(game);
}

playGame(game);
