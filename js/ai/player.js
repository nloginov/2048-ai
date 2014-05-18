/*jslint browser: true, white: true, vars: true */
/*globals GameManager, proxy_makeMove */

(function (global) {
    "use strict";
    var emptyFunc = function () { return undefined; };
    function fakeInputManager() {
        this.on = emptyFunc;
    }
    
    function fakeActuator() {
        this.actuate = emptyFunc;
    }
    
    function makeMove(model, move) {
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
        gameManager.move(move);
        return {
            score: gameManager.score,
            model: JSON.parse(JSON.stringify(gameManager.serialize())),
            wasMoved: JSON.stringify(gameManager.serialize().grid) !== JSON.stringify(model.grid),
            move: move
        };
    }

    global.proxy_makeMove = makeMove;
}(window));

(function (global) {
    "use strict";

    var keydown = function (k) {
        var oEvent = document.createEvent('KeyboardEvent');

        Object.defineProperty(oEvent, 'keyCode', {
            get : function() {
                return this.keyCodeVal;
            }
        });     
        Object.defineProperty(oEvent, 'metaKey', {
            get : function() {
                return false;
            }
        });     
        Object.defineProperty(oEvent, 'shiftKey', {
            get : function() {
                return false;
            }
        });     
        Object.defineProperty(oEvent, 'which', {
            get : function() {
                return this.keyCodeVal;
            }
        });     
        
        Object.defineProperty(oEvent, 'target', {
            get : function() {
                return {tagName: ""};
            }
        });     

        if (oEvent.initKeyboardEvent) {
            oEvent.initKeyboardEvent("keydown", true, true, document.defaultView, false, false, false, false, k, k);
        } else {
            oEvent.initKeyEvent("keydown", true, true, document.defaultView, false, false, false, false, k, 0);
        }

        oEvent.keyCodeVal = k;

        if (oEvent.keyCode !== k) {
            throw "keyCode mismatch " + oEvent.keyCode + "(" + oEvent.which + ")";
        }

        document.dispatchEvent(oEvent);
    };

    function runAI() {
        var MOVE = {
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40
        };

        /*var makeAIMove = function () {
            var moves = [MOVE.LEFT, MOVE.UP, MOVE.RIGHT, MOVE.DOWN];
            var randomIndex = Math.floor(Math.random()*4);
            var randomMove = moves[randomIndex];
            return randomMove;
        };*/

        /*var oneLevelAI = function (model) {
            var possibleMoves = [0, 1, 2, 3].map(function (internalMove) {
                var copyOfModel = JSON.parse(JSON.stringify(model));
                return proxy_makeMove(copyOfModel, internalMove);
            });

            var bestMove = possibleMoves.sort(function (a, b) {
                var d = a.score - b.score;
                if (d === 0 ) {
                    d = (a.wasMoved ? 1 : 0) - (b.wasMoved ? 1 : 0);
                }
                return -d;
            })[0];

            var moves = [MOVE.UP, MOVE.RIGHT, MOVE.DOWN, MOVE.LEFT];
            return moves[bestMove.move];
        };*/

        var treeAI = function (model, maxLevel) {
            var leaves = [];

            var expandTree = function (node, level) {
                if (level == maxLevel) {
                    leaves.push(node);
                    return;
                }

                var possibleMoves = [0, 1, 2, 3].map(function (internalMove) {
                    var copyOfModel = JSON.parse(JSON.stringify(node.value));
                    var newNode = {
                        value: proxy_makeMove(copyOfModel.model, internalMove), 
                        children: [],
                        move: internalMove,
                        parent: node
                    };

                    if(newNode.value.wasMoved) {
                        node.children.push(newNode);
                    }
                });

                node.children.forEach(function (childNode) {
                    expandTree(childNode, level + 1);
                });

                if(node.children.length == 0) {
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

            var moves = [MOVE.UP, MOVE.RIGHT, MOVE.DOWN, MOVE.LEFT];
            return moves[bestMove];
        };
        
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
