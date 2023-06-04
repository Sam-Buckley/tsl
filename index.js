const tsl = require("./src/evaluator.js");
const fs = require("fs");
const { time } = require("console");

//take the file as an argument
let file = process.argv[2];
let args = process.argv.slice(3);

if (file.startsWith("C:\\")) {
    //resolve the path if it is absolute
    segments = file.split("\\");
    file = require("path").resolve(...segments);
}
fs.readFile(`${file}`, "utf8", (err, data) => {
    if (err) {
        throw err;
    }
    //use a time module to measure the time it takes to evaluate the program
    let start = new Date().getTime();
    //args are passed before the --f flag
    //check if args are passed
    if (args.includes("--a")) {
        template = `
:cli
    list
    pop acli`
        //run until end o args or --f
        let i = args.indexOf("--a") + 1;
        while (i < args.length && !args[i].includes("--")) {
            //add the arg to the data
            template += "\n" + `append acli "${args[i]}"`;
            i++;
        }
        template += "\nreturn"
        data += "\n" + template;
    }
    //check if the user passes extra files (--f <files> <file> etc) and/or std (--std <file> etc)
    if (args.includes("--f")) {
        //run until end o args or --std
        let i = args.indexOf("--f") + 1;
        while (i < args.length && !args[i].includes("--")) {
            //read the file and add it to the data
            //if the file is absolute, resolve it
            if (args[i].startsWith("C:\\")) {
                segments = args[i].split("\\");
                args[i] = require("path").resolve(...segments);
            }
            data += "\n" + fs.readFileSync(`./${args[i]}`, "utf8");
            i++;
        }
    }
    tsl.evaluate(data);
    let end = new Date().getTime();
    console.log(`Program took ${end - start}ms to evaluate`);
});