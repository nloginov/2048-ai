/*jslint browser: true, white: true, vars: true */
/*global runAI: false */

window.onload = function () {
    "use strict";
    var aiButton = document.querySelector(".ai-button");
    aiButton.addEventListener("click", function () {
        runAI();
    });
};
