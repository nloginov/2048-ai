var fs = require("fs")
var code = fs.readFileSync("js/ai/player.js") + ";runAI();"

var uglifyjs = require("uglifyjs");
var minifiedCode = uglifyjs.minify(code, {fromString: true}).code;
var addressStringCode = "javascript:" + minifiedCode;



console.log("**********************************************");
console.log("* Past code below in browser address string. *");
console.log("* Check that 'javascript:' prefix is present.*");
console.log("**********************************************");
console.log(addressStringCode);
