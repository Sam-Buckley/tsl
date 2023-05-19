const tsl = require("./src/evaluator.js");
const fs = require("fs");
const { time } = require("console");

//take the file as an argument
let file = process.argv[2];

fs.readFile(`./${file}`, "utf8", (err, data) => {
    if (err) {
        throw err;
    }
    //use a time module to measure the time it takes to evaluate the program
    let start = new Date().getTime();
    tsl.evaluate(data);
    let end = new Date().getTime();
    console.log(`Program took ${end - start}ms to evaluate`);
});