const prompt = require('prompt-sync')();
const error = require("./error.js").error;
//create a return stack to store the return addresses
var returnStack = [];
async_lines = []
//create a stack to store the values
//create a dictionary to store the variables
var stack = Object.create(null)
stack.true = true;
stack.undefined = undefined
stack.false = false;
//create a dictionary to store the functions
var functions = Object.create(null);
var specialForms = Object.create(null);
//create a dictionary to store the labels
var labels = Object.create(null);
var program = []
let currentLine = 0;
let thread = 0;
function kill() {
    process.exit();
}
let start;
let end;
const goStack = []
const Token = require("./token.js").Token;
//function to parse an expression usibf the shunting yard algorithm
//function to parse a line of code into a list of tokens
//for each line, the first token is the command, and the rest are arguments
//check the entire line for mathemtical expressions and parse them using the shunting yard algorithm and the parseExpression function
function parseLine(line) {
    if (line.startsWith("#")) {
        return new Token("comment", line);
    }
    //do as above
    line = skipWhitespace(line);
    var tokens = line.split(/\s+/);
    var command = tokens[0];
    var args = [];
    for (var i = 1; i < tokens.length; i++) {
        //if the token starts with a ' it is a comment, so break the loop
        if (tokens[i].startsWith("#")) {
            break;
        }
        //if 1 token starts with a quote, it is a string literal, peek ahead until the next quote
        if (tokens[i].startsWith('"')) {
            tokens[i] = tokens[i].slice(1);
            //create a string variable to store the string literal
            var string = "";
            //loop through the tokens
            for (var j = i; j < tokens.length; j++) {
                //if the token ends with a quote, add it to the string and break the loop
                if (tokens[j].endsWith('"')) {
                    string += tokens[j].slice(0, tokens[j].length - 1);
                    i = j;
                    break;
                } else {
                    //otherwise, add the token to the string
                    string += tokens[j] + " ";
                }
            }
            args.push(new Token("str", string));
        } //else if it's a number/ident inside [], it's a stack dereference
        else if (tokens[i].startsWith("[")) {
            //create a string variable to store the stack dereference
            var string = "";
            tokens[i] = tokens[i].slice(1);
            //loop through the tokens
            for (var j = i; j < tokens.length; j++) {
                //if the token ends with a ], add it to the string and break the loop
                if (tokens[j].endsWith("]")) {
                    string += tokens[j].split("]").join("");
                    i = j;
                    break;
                }
                else {
                    //otherwise, add the token to the string
                    string += tokens[j];
                }
            }
            //add the stack dereference to the args
            args.push(new Token("stack_deref", string));
        } //else if it's a number/ident inside {}, it's a stack reference
        else if (tokens[i].match(/^[0-9\.\-]+$/)) {
            args.push(new Token("int", parseInt(tokens[i])));
        } else if (tokens[i].match(/^[a-zA-Z0-9\*\@\_]+$/)) {
            args.push(new Token("ident", tokens[i]));
        } //or if it's an ident or string inside (), it's a deref
        else if (tokens[i].startsWith("(")) {
            //create a string variable to store the deref
            var string = "";
            tokens[i] = tokens[i].slice(1);
            //loop through the tokens
            for (var j = i; j < tokens.length; j++) {
                //if the token ends with a ), add it to the string and break the loop
                if (tokens[j].endsWith(")")) {
                    string += tokens[j].split(")").join("");
                    i = j;
                    break;
                }
                //otherwise, add the token to the string
                else {
                    string += tokens[j];
                }
            }
            //add the deref to the args
            args.push(new Token("deref", string));
        } //else if it's a number/ident inside {}, it's a stack referencef
        else {
            kill(error("Invalid argument: " + tokens[i], "SyntaxError", currentLine))
        }
    }
    //return the command and the args
    return new Token("command", {command: command, args: args});
}


//function to skip whitespace
function skipWhitespace(string) {
    var i = 0;
    while (string[i] == " ") {
        i++;
    }
    return string.slice(i);
}

//function to "scan" the program and find the labels
function scan(program) {
    //split the program into lines
    program = program.split("\n");
    //loop through the program
    for (i in program) {
        line = program[i];
        //if the line is a label, add it to the labels dictionary
        if (line.trim().startsWith(":")) {
            //get the label name
            var labelName = line.split(":")[1].trim().split(" ")[0];
            //add the label to the labels dictionary
            labels[labelName] = i;
        }
    }
}
//function to scan the program for syntax errors
//errors include:
//1. a label is defined twice
//2. a label is defined but never used
//3. a label is used but never defined
//4. a label is called with a colon
//5. a label is called without a *
//6. unclosed quotes


//function to evaluate the program, it can possibly be made async in the middle of the program
//if the program becomes async, the async_lines will be iterated through and evaluated until the length is 1 (main program)
//the program runs in a while loop, and the current line is evaluated
//it starts at the line denoted by labels["main"]
//constantly check if the length of async_lines is greater than 1, if it is, "zip" through the async_lines and evaluate them
//if the length of async_lines is 1, continue evaluating the main program
function evaluate(prg) {
    if(require("./scanner.js")(prg)) {
        return
    };
    scan(prg);
    //split the program into lines
    program = prg.split("\n");
    currentLine = labels["main"];
    //async_lines stores all current lines, even if there is 1 thread
    //push the main label to the async_lines array
    async_lines.push(labels["main"])
    start = new Date().getTime();
    //loop through the program
//constantly check if the length of async_lines is greater than 1, if it is, "zip" through the async_lines and evaluate them
//if the length of async_lines is 1, continue evaluating the main program
    while (true) {
        //if the length of async_lines is 1, continue evaluating the main program
        let res = evaluateLine(program[currentLine]);
        if (res == "label") {
            currentLine++
            continue;
        }
        if (currentLine >= program.length) {
            currentLine++
            break;
        }
        if (res == undefined) {
            currentLine++
            continue;
        }
        //push res to the return stack
        returnStack.push(res);
        currentLine++
    }
}
//function to evaluate a string, integer, or identifier
function evaluateArg(arg) {
    //if the arg is a string, return it
    if (arg.type == "str") {
        return arg.value;
    }
    //if the arg is an integer, return it
    if (arg.type == "int") {
        return arg.value;
    }
    if (arg.type == "stack_deref") {
        //we want to see if there's a + or - in the string, and then evaluate the expression (check for number or ident)
        //if there's a + or -, split the string into two parts, and evaluate the expression
        if (arg.value.includes("+")) {
            parts = arg.value.split("+");
            console.log(parts)
            for (i in parts) {
                console.log(parts[i])
                if (parts[i].match(/^[0-9\.\-]+$/)) {
                    parts[i] = parseInt(parts[i]);
                }
                if (parts[i].match(/^[a-zA-Z0-9\*\@\_]+$/)) {
                    parts[i] = stack[parts[i]];
                }
            }
            value = parts[0] + parts[1];
        } else if (arg.value.includes("-")) {
            parts = arg.value.split("-");
            for (i in parts) {
                if (parts[i].match(/^[0-9\.\-]+$/)) {
                    parts[i] = parseInt(parts[i]);
                }
                if (parts[i].match(/^[a-zA-Z0-9\*\@\_]+$/)) {
                    parts[i] = stack[parts[i]];
                }
            }
            value = parts[0] - parts[1];
        } else {
            value = arg.value;
        }
        return returnStack[returnStack.length - value - 1];
    }
    //if the arg is an identifier, return the value of the identifier
    if (arg.type == "ident") {
        if (arg.value in stack) {
            return stack[arg.value];
        } if (arg.value.startsWith("@")) {
            if (arg.value == "@r") {
                return returnStack[returnStack.length - 1];
            } else if (arg.value == "@p") {
                return currentLine;
            } else if (arg.value == "@l") {
                return labels["@l"];
            }
        } else {
            return undefined
        }
    }
    //if the arg is an expression, evaluate the expression
    if (arg.type == "expression") {
        return evaluateExpression(arg.value);
    }
}

//function to evaluate a line of code, if the line is a label, do nothing
function evaluateLine(line) {
    line = line.trim()
    //if the line is a label, do nothing
    if (line.trim().startsWith(":")) {
        return "label"
    }
    //parse the line
    line = parseLine(line);
    if (line.type == "comment") {
        return undefined;
    }
    //get the command and the args
    var command = line.value.command;
    var args = line.value.args;
    if (command in specialForms) {
        //pass
    } else {
        for (i in args) {
            args[i] = evaluateArg(args[i]);
        }
    }
    //evaluate the command
    return evaluateCommand(command, args);
}
functions.newline = function() {
    return "\n"
}
function evaluateCommand(command, args) {
    //check if command is in the commands dictionary
    //check if command is exit
    if (command == "exit") {
        end = new Date().getTime();
        console.log(`Program took ${end - start}ms to evaluate`);
        kill();
    }
    //check if command is whitespace or a comment
    if (command.trim() == "" || command == "comment") {
        return undefined;
    }
    if (command in functions) {
        return functions[command](args);
    } if (command in specialForms) {
        return specialForms[command](args);
    } else {
        error("command " + command + " is not defined", "NameError", currentLine);
    }
}

//set of functions for lists
specialForms.list = function(args) {
    //create a list
    return []
}
functions.inc = function(args) {
    //check if list has item
    return args[0].includes(args[1])
}
//stack.atz is a list of a-zA-Z\_
stack.atz = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"
stack.nums = "0123456789-"
specialForms.append = function(args) {
    //push an element to a list
    //get the list
    //variable = args[0].value;
    stack [args[0].value].push(evaluateArg(args[1]));
}
specialForms.remove = function(args) {
    //remove an element from a list
    //get the list
    list = evaluateArg(args[0]);
    //get the index
    index = evaluateArg(args[1]);
    //if index is negative, go rom the end of the list
    if (index < 0) {
        index = list.length - index;
    }
    //remove the element
    list.splice(index, 1);
    stack [args[0].value] = list;
}
specialForms.idx = function(args) {
    //get the list
    list = evaluateArg(args[0]);
    //get the index
    index = evaluateArg(args[1]);
    //if index is negative, go rom the end of the list
    if (index < 0) {
        index = list.length - index;
    }
    //return the element at the index
    return list[index];
}
specialForms.len = function(args) {
    //get the list
    list = evaluateArg(args[0]);
    //return the length of the list
    return list.length;
}
functions.join = function(args) {
    return args[0].join(args[1])
}
functions.split = function(args) {
    return args[0].split(args[1])
}
functions.quote = () => {
    return '"'
}

stack.newln = "\n"
functions.out = function(args) {
    //print the args
    if (args.length == 0) {
        console.log(returnStack[returnStack.length -1])
        return undefined
    }
    if (args.length == 1) {
        console.log(args[0]);
    } else {
        for (i in args) {
            process.stdout.write(args[i].toString());
        }
        process.stdout.write("\n");
    }
    return undefined;
}
specialForms.print = function(args) {
    ls = []
    for(i in args) {
        ls.push(evaluateArg(args[i]));
    }
    console.log(ls.join(" "));
    return undefined;
}
specialForms.in = function(args) {
    //get input from the use
    if (args[1]) p = evaluateArg(args[1])
    else p = ""
    var input = prompt(p)
    //set the variable to the input
    if (!args[0]) return input
    stack[args[0].value] = input;
    return input;
}
specialForms.int = function(args) {
	if (!args[0]) {
		value = returnStack[returnStack.length - 1]
	}
	else {
		value = evaluateArg(args[0])
	}
	if (typeof value == 'number') {
		return Math.floor(value)
	} else {
		return Number(value)
	}
}
specialForms.mov = function(args) {
    //set the value of the variable to the value
    m = args[0].value;
    if (!args[1]) value = returnStack[returnStack.length - 1]
    else value = evaluateArg(args[1]);
    stack[m] = value;
}
functions.async = (args) => {
    //with the givem number, create a new async thread at line n
    n = args[0]
    async_lines.push(n)
    thread++;
    return undefined;
}
specialForms.goto = function(args) {
    //set the current line to the line of the label
    //if the input is in the stack, set the current line to the line of the label
    currentLine = labels[args[0].value.split("*")[1]];
    return undefined;
}
specialForms.gosub = (args) => {
    togo = args[0].value.split("*")[1]
    goStack.push(currentLine)
    currentLine = labels[togo]
}
specialForms.gosub_if = (args) => {
    togo = args[0].value.split("*")[1];
    if (returnStack[returnStack.length - 1] == true) {
        goStack.push(currentLine)
        currentLine = labels[togo]
    }
}
functions.return = function() {
    if (async_lines.length > 1) {
        async_lines.splice(thread, 1)
    }
    if (goStack.length == 0) {
        return kill(error("Nowhere to return to", "OrphanedReturn", currentLine, "return", "return", "This label is to be gosubbed"))
    }
    currentLine = goStack[goStack.length - 1]
    goStack.pop(goStack.length -1)
}
functions.clcc = function() {
    console.log(`thread: ${thread}`)
    async_lines.splice(thread, 1)
}
specialForms.goto_if = function(args) {
    if (returnStack[returnStack.length - 1] == true) {
        currentLine = labels[args[0].value.split("*")[1]];
    }
    return undefined;
}
functions.cmp = function(args) {
    //if no args are passed, compare the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 1] == returnStack[returnStack.length - 2];
    }
    //if one arg is passed, compare the arg to the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] == args[0];
    }
    //if two args are passed, compare the args
    if (args.length == 2) {
        return args[0] == args[1];
    }
}

functions.ncmp = function(args) {
    //if no args are passed, compare the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 1] != returnStack[returnStack.length - 2];
    }
    //if one arg is passed, compare the arg to the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] != args[0];
    }
    //if two args are passed, compare the args
    if (args.length == 2) {
        return args[0] != args[1];
    }
}
functions.dup =(_args) => {
    returnStack.push(returnStack[returnStack.length - 1]);
}
functions.stack = function(_args) {
    console.log(returnStack);
}
functions.push = function(args) {
    returnStack.push(args[0]);
}
functions.mul = function(args) {
    //if no args are passed, multiply the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 1] * returnStack[returnStack.length - 2];
    }
    //if one arg is passed, multiply the arg by the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] * args[0];
    }
    //if two args are passed, multiply the args
    if (args.length == 2) {
        return args[0] * args[1];
    }
}
functions.mod = function(args) {
    //if no args are passed, mod the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 2] % returnStack[returnStack.length - 1];
    }
    //if one arg is passed, mod the arg by the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] % args[0];
    }
    //if two args are passed, mod the args
    if (args.length == 2) {
        return args[0] % args[1];
    }
}
functions.div = function(args) {
    //if no args are passed, divide the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 1] / returnStack[returnStack.length - 2];
    }
    //if one arg is passed, divide the arg by the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] / args[0];
    }
    //if two args are passed, divide the args
    if (args.length == 2) {
        return args[0] / args[1];
    }
}
functions.add = function(args) {
    //if no args are passed, add the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 1] + returnStack[returnStack.length - 2];
    }
    //if one arg is passed, add the arg to the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] + args[0];
    }
    //if two args are passed, add the args
    if (args.length == 2) {
        return args[0] + args[1];
    }
}
specialForms.parse = function(args) {
    //get the name of the variable, and the int version
    m = args[0].value;
    console.log(args[0])
    n = evaluateArg(m)
    if (isNaN(n)) {
        error("cannot parse " + m + " to an int", "ValueError", currentLine, null, null, "Make sure the variable is an int");
    } else {
        //set the variable to the int version
        stack[m] = n;
        return n;
    }
}
functions.floor = (args) => {
    //floor the top element of the stack or the arg
    if (args.length == 0) {
        return Math.floor(returnStack[returnStack.length - 1]);
    } else {
        return Math.floor(args[0]);
    }
}
functions.sub = function(args) {
    //if no args are passed, subtract the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 1] - returnStack[returnStack.length - 2];
    }
    //if one arg is passed, subtract the arg from the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] - args[0];
    }
    //if two args are passed, subtract the args
    if (args.length == 2) {
        return args[0] - args[1];
    }
}
specialForms.mut = function(args) {
    //this function edits the value of a variable
    //get the name of the variable
    m = args[0].value;
    //get the value of the variable
    n = stack[m];
    //set the variable to the evaluated value
    stack[m] = evaluateArg(args[1]);
}
specialForms.label = function(args) {
    //add the label to the labels dictionary
    n = args[0].value.split("*")[1];
    labels["@l"] = labels[n]
    stack["@l"] = labels[n]
}
functions.gt = function(args) {
    //if no args are passed, compare the top two elements of the stack
    if (args.length == 0) {
        return returnStack[returnStack.length - 1] > returnStack[returnStack.length - 2];
    }
    //if one arg is passed, compare the arg to the top element of the stack
    if (args.length == 1) {
        return returnStack[returnStack.length - 1] > args[0];
    }
    //if two args are passed, compare the args
    if (args.length == 2) {
        return args[0] > args[1];
    }
}
functions.read = function(args) {
    //read a file
    //get the name of the file
    file = args[0];
    //read the file
    return require("fs").readFileSync(file, "utf-8");
}
specialForms.drop = function(args) {
    if (args[0].type == "ident") {
        delete stack[args[0].value]
        return
    }
    if (args[0].type == "stack_deref") {
        returnStack.splice(returnStack.length - args[0].value - 1, 1)
        return
    }
}
specialForms.pop = function(args) {
    if (args.length == 0) {
        returnStack.pop();
        return
    }
    if (!args[0].type == "ident") {
        error("Identifier not provided", "TypeError", currentLine, program[currentLine], null, "Provide a variable s an argument")
        return
    }
    stack[args[0].value]=returnStack.pop()
    return
}
specialForms.call = function(args) {
    //call the provided function
    tr = currentLine;
    n = args[0].value;
    currentLine = labels[n];
    labels["@l"] = tr
}
functions.rand = function(args) {
    if (args.length == 0) {
        max = returnStack[returnStack.length - 1]
        min = returnStack[returnStack.length - 2]
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
    if (args.length == 1) {
        max = args[0]
        min = returnStack[returnStack.length - 1]
        return  Math.floor(Math.random() * (max - min + 1) + min)
    }
    if (args.length == 2) {
        return Math.floor(Math.random() * (args[0] - args[1]) + args[1])  
    }
}
functions.r = function(args) {
    return returnStack[returnStack.length - args[0]]
}

const _evaluate = evaluate;
module.exports.evaluate = _evaluate;
module.exports.scanProgram = require("./scanner.js");
