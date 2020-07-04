// NOTE: most of this code is from:
// https://github.com/nloginov/2048-ai

var AI = {};
AI.MOVE = { LEFT: 37, UP: 38,  RIGHT: 39, DOWN: 40 };

let MOVE_MAP = { 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down' };
let VALUE_MAP = {
  2: 1, 4: 2, 8: 3,
  16: 4, 32: 5, 64: 6,
  128: 7, 256: 8, 512: 9,
  1024: 10, 2048: 11, 4096: 12,
  8192: 13, 16384: 14, 32768: 15
};

let DOCTOR_NUMBER_MAP = {
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

AI.Service = {
    enumerateAllMoves: function () {
        "use strict";
        return [AI.MOVE.UP, AI.MOVE.RIGHT, AI.MOVE.DOWN, AI.MOVE.LEFT];
    },
    imitateMove: (function() {
        "use strict";
        var emptyFunc = function () { return undefined; };
        function fakeInputManager() {
            this.on = emptyFunc;
        }

        function fakeActuator() {
            this.actuate = emptyFunc;
        }

        var moveMapping = [];
        moveMapping[AI.MOVE.UP] = 0;
        moveMapping[AI.MOVE.RIGHT] = 1;
        moveMapping[AI.MOVE.DOWN] = 2;
        moveMapping[AI.MOVE.LEFT] = 3;

        return function makeMove(model, move) {
            var internalMove = moveMapping[move];
            var gameManager = new GameManager(model.grid.size, fakeInputManager, fakeActuator,
                function fakeStorageManager() {
                    this.getGameState = function () {
                        return model;
                    };
                    this.clearGameState = emptyFunc;
                    this.getBestScore = emptyFunc;
                    this.setGameState = emptyFunc;
                });
            gameManager.actuate = emptyFunc;
            gameManager.keepPlaying = true;
            gameManager.move(internalMove);
            return {
                score: gameManager.score,
                    model: JSON.parse(JSON.stringify(gameManager.serialize())),
                    wasMoved: JSON.stringify(gameManager.serialize().grid) !== JSON.stringify(model.grid),
                    move: move
            };
        };
    }())
};


var randomMoveAI = function () {
    "use strict";
    var moves = AI.Service.enumerateAllMoves();
    var randomIndex = Math.floor(Math.random()*moves.length);
    var randomMove = moves[randomIndex];
    return randomMove;
};

var oneLevelAI = function (model) {
    "use strict";
    var possibleMoves = AI.Service.enumerateAllMoves().map(function (move) {
        var copyOfModel = JSON.parse(JSON.stringify(model));
        return AI.Service.imitateMove(copyOfModel, move);
    });

    var bestMove = possibleMoves.sort(function (a, b) {
        var d = a.score - b.score;
        if (d === 0 ) {
            d = (a.wasMoved ? 1 : 0) - (b.wasMoved ? 1 : 0);
        }
        return -d;
    })[0];

    return bestMove.move;
};

var treeAI = function (model, maxLevel) {
    "use strict";
    var leaves = [];

    var expandTree = function (node, level) {
        if (level === maxLevel) {
            leaves.push(node);
            return;
        }

        AI.Service.enumerateAllMoves().map(function (move) {
            var copyOfModel = JSON.parse(JSON.stringify(node.value));
            var newNode = {
                value: AI.Service.imitateMove(copyOfModel.model, move),
                children: [],
                move: move,
                parent: node
            };

            if(newNode.value.wasMoved) {
                node.children.push(newNode);
            }
        });

        node.children.forEach(function (childNode) {
            expandTree(childNode, level + 1);
        });

        if(node.children.length === 0) {
            leaves.push(node);
        }
    };

    var rootNode = {value: {model: model}, children: []};
    expandTree(rootNode, 0);

    var bestNode = leaves.sort(function (a, b) {
        return b.value.score - a.value.score;
    })[0];

    var bestMove;
    while (bestNode.parent !== undefined) {
        bestMove = bestNode.move;
        bestNode = bestNode.parent;
    }

    return bestMove;
};

function biggestTile(game) {
  let tiles = game.grid.cells.map(row => row.map(cell => cell ? cell.value : 1)).flat();

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
                }
            });
        };

        defineConstantGetter('keyCode', k);
        defineConstantGetter('which', k);
        defineConstantGetter('metaKey', false);
        defineConstantGetter('shiftKey', false);
        defineConstantGetter('target', { tagName: "" });

        if (oEvent.initKeyboardEvent) {
            oEvent.initKeyboardEvent("keydown", true, true, document.defaultView, false, false, false, false, k, k);
        } else {
            oEvent.initKeyEvent("keydown", true, true, document.defaultView, false, false, false, false, k, 0);
        }

        document.dispatchEvent(oEvent);
    };

    function runAI() {
      function runAlgorithm() {
        let model = JSON.parse(localStorage.getItem("gameState"));

        if(model !== null) {
          console.group('Board State');
          console.debug(model);
          let biggest = biggestTile(model).num;
          console.debug(`Biggest Tile: ${biggest} | ${DOCTOR_NUMBER_MAP[biggest]}`);

          console.time('calculating best move');
          let aiMove = treeAI(model, Math.max(biggest - 3, 1));
          console.timeEnd('calculating best move');

          console.debug('Best Move: ', MOVE_MAP[aiMove]);
          console.groupEnd();

          if (aiMove) {

            // calculating the move could take a while,
            // be kind to the browser and issue a dom-changing event
            // next time we're idle
            requestIdleCallback(() => {
              keydown(aiMove);

              // allow time for the animation
              setTimeout(() => {
                requestIdleCallback(runAlgorithm);
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
      run.style="position: fixed; top: 1rem; left: 1rem;";
      run.addEventListener('click', () => runAI());

      document.body.appendChild(run);
    }

    installUI();
}

boot();
