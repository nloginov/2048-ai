/*jslint browser: true, white: true, vars: true */

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

        var makeAIMove = function () {
            var moves = [MOVE.LEFT, MOVE.UP, MOVE.RIGHT, MOVE.DOWN];
            var randomIndex = Math.floor(Math.random()*4);
            var randomMove = moves[randomIndex];
            return randomMove;
        };

        function aiLoop() {
            setTimeout(function () {
                var model = JSON.parse(localStorage.getItem("gameState"));
                if(model !== null) {
                    var aiMove = makeAIMove(model);
                    keydown(aiMove);
                    aiLoop();
                }
            }, 100);
        }

        aiLoop();
    }

    global.runAI = runAI;
}(window));
