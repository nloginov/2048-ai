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

function biggestTile(grid) {
  let tiles = grid.cells.map(row => row.map(cell => cell.value)).flat();

  let value = Math.max(tiles);

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

          console.time('calculating best move');
          let aiMove = treeAI(model, biggestTile(model).num || 4);
          console.timeEnd('calculating best move');

          console.debug('Best Move: ', MOVE_MAP[aiMove]);
          console.groupEnd();

          if (aiMove) {

            requestIdleCallback(() => {
              keydown(aiMove);
              requestIdleCallback(runAlgorithm);
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
