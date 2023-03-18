const tsl = require("./src/evaluator.js");
const fs = require("fs");

fs.readFile("./main.tsl", "utf8", (err, data) => {
    if (err) {
        throw err;
    }
    if(tsl.scanProgram(data) != true) {
        tsl.evaluate(data);
    }
});