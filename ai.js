// NOTE: original code from:
// https://github.com/nloginov/2048-ai
/* global GameManager */

var AI = {};
AI.MOVE = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };

const ALL_MOVES = [AI.MOVE.UP, AI.MOVE.RIGHT, AI.MOVE.DOWN, AI.MOVE.LEFT];

const MOVE_MAP = { 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down' };

const MOVE_KEY_MAP = {
  [AI.MOVE.UP]: 0,
  [AI.MOVE.RIGHT]: 1,
  [AI.MOVE.DOWN]: 2,
  [AI.MOVE.LEFT]: 3,
};

const VALUE_MAP = {
  2: 1,
  4: 2,
  8: 3,
  16: 4,
  32: 5,
  64: 6,
  128: 7,
  256: 8,
  512: 9,
  1024: 10,
  2048: 11,
  4096: 12,
  8192: 13,
  16384: 14,
  32768: 15,
};

const DOCTOR_NUMBER_MAP = {
  1: '01 - William Hartnell',
  2: '02 - Patrick Troughton',
  3: '03 - Jon Pertwee',
  4: '04 - Tom Baker',
  5: '05 - Peter Davison',
  6: '06 - Colin Baker',
  7: '07 - Sylvester McCoy',
  8: '08 - Paul McGann',
  9: 'War - John Hurt',
  10: '09 - Christopher Eccleston',
  11: '10 - David Tennant',
  12: '11 - Matt Smith',
  13: '12 - Peter Capaldi',
  14: '13 - Jodie Whittaker',
};

const voidFn = () => undefined;
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const isEqual = (a, b) => {
  // a and b have the same dimensions
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (a[i][j] !== b[i][j]) {
        return false;
      }
    }
  }

  return true;
};

function fakeGameFrom(model) {
  function fakeInputManager() {
    this.on = voidFn;
  }

  function fakeActuator() {
    this.actuate = voidFn;
  }

  let gameManager = new GameManager(
    model.grid.size,
    fakeInputManager,
    fakeActuator,
    function fakeStorageManager() {
      this.getGameState = function () {
        return model;
      };

      this.clearGameState = voidFn;
      this.getBestScore = voidFn;
      this.setGameState = voidFn;
    }
  );

  return gameManager;
}

AI.Service = {
  imitateMove: (function () {
    return function makeMove(model, move) {
      let gameManager = fakeGameFrom(model);
      let internalMove = MOVE_KEY_MAP[move];

      gameManager.actuate = voidFn;
      gameManager.keepPlaying = true;
      gameManager.move(internalMove);

      let serialized = gameManager.serialize();

      return {
        move,
        score: gameManager.score,
        model: clone(serialized),
        wasMoved: !isEqual(serialized.grid, model.grid),
      };
    };
  })(),
};

function treeAI(model, maxLevel) {
  let leaves = [];

  function expandTree(node, level) {
    if (level === maxLevel) {
      leaves.push(node);

      return;
    }

    for (let move of ALL_MOVES) {
      let copyOfModel = clone(node.value);
      let moveData = AI.Service.imitateMove(copyOfModel.model, move);

      let newNode = {
        // penalize scores with higher depth
        // also, add one to both level and maxLevel to avoid division by 0
        weightedScore: moveData.score / ((level + 1) / (maxLevel + 1)),
        value: moveData,
        children: [],
        move: move,
        parent: node,
      };

      if (newNode.value.wasMoved) {
        node.children.push(newNode);
      }
    }

    for (let childNode of node.children) {
      expandTree(childNode, level + 1);
    }

    if (node.children.length === 0) {
      leaves.push(node);
    }
  }

  let rootNode = {
    value: { model },
    children: [],
  };

  expandTree(rootNode, 0);

  let sortedLeaves = leaves.sort((a, b) => b.weightedScore - a.weightedScore);
  let bestNode = sortedLeaves[0];

  console.debug(
    sortedLeaves.map((l) => ({ ws: l.weightedScore, s: l.value.score }))
  );

  let bestMove;

  while (bestNode.parent !== undefined) {
    bestMove = bestNode.move;
    bestNode = bestNode.parent;
  }

  return bestMove;
}

function biggestTile(game) {
  let tiles = game.grid.cells
    .map((row) => row.map((cell) => (cell ? cell.value : 1)))
    .flat();

  let value = Math.max(...tiles);

  return { value, num: VALUE_MAP[value] };
}

function boot() {
  function keydown(k) {
    let oEvent = document.createEvent('KeyboardEvent');

    function defineConstantGetter(name, value) {
      Object.defineProperty(oEvent, name, {
        get() {
          return value;
        },
      });
    }

    defineConstantGetter('keyCode', k);
    defineConstantGetter('which', k);
    defineConstantGetter('metaKey', false);
    defineConstantGetter('shiftKey', false);
    defineConstantGetter('target', { tagName: '' });

    if (oEvent.initKeyboardEvent) {
      oEvent.initKeyboardEvent(
        'keydown',
        true,
        true,
        document.defaultView,
        false,
        false,
        false,
        false,
        k,
        k
      );
    } else {
      oEvent.initKeyEvent(
        'keydown',
        true,
        true,
        document.defaultView,
        false,
        false,
        false,
        false,
        k,
        0
      );
    }

    document.dispatchEvent(oEvent);
  }

  function runAI() {
    function runAlgorithm() {
      let model = JSON.parse(localStorage.getItem('gameState'));

      if (model !== null) {
        console.group('Board State');
        console.debug(model);
        let biggest = biggestTile(model).num;

        console.debug(
          `Biggest Tile: ${biggest} | ${DOCTOR_NUMBER_MAP[biggest]}`
        );

        console.time('calculating best move');
        let aiMove = treeAI(model, Math.max(biggest - 3, 1));

        console.timeEnd('calculating best move');

        console.debug('Best Move: ', MOVE_MAP[aiMove]);
        console.groupEnd();

        if (!model.over) {
          // calculating the move could take a while,
          // be kind to the browser and issue a dom-changing event
          // next time we're idle
          requestIdleCallback(() => {
            keydown(aiMove);

            // allow time for the animation
            setTimeout(() => {
              requestAnimationFrame(runAlgorithm);
            }, 100);
          });
        }
      }
    }

    requestIdleCallback(runAlgorithm);
  }

  function installUI() {
    let run = document.createElement('button');

    run.innerText = 'Run A.I.';
    run.style = 'position: fixed; top: 1rem; left: 1rem;';
    run.addEventListener('click', () => runAI());

    document.body.appendChild(run);
  }

  installUI();
}

boot();
