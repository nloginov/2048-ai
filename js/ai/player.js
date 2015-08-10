/*jslint browser: true, white: true, vars: true */
/*globals GameManager, proxy_makeMove */
var AI = {};
AI.MOVE = { LEFT: 37, UP: 38,  RIGHT: 39, DOWN: 40 };
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

(function (global) {
    "use strict";

    var keydown = function (k) {
        var oEvent = document.createEvent('KeyboardEvent');

        var defineConstantGetter = function (name, value) {
            Object.defineProperty(oEvent, name, {
                get : function() {
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
        function aiLoop(aiAlgorithm) {
            setTimeout(function () {
                var model = JSON.parse(localStorage.getItem("gameState"));
                if(model !== null) {
                    var aiMove = aiAlgorithm(model);
                    keydown(aiMove);
                    aiLoop(aiAlgorithm);
                }
            }, 100);
        }

        aiLoop(function (model) { return treeAI(model, 3);});
    }

    global.runAI = runAI;
}(window));
