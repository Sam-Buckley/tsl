const prompt = require('prompt-sync')();
const error = require('./error.js').error;
//create a return stack to store the return addresses
var returnStack = [];
//create a stack to store the values
//create a dictionary to store the variables
var stack = Object.create(null)
//create a dictionary to store the functions
var functions = Object.create(null);
var specialForms = Object.create(null);
//create a dictionary to store the labels
var labels = Object.create(null);
let currentLine = 0;
function update() {
    stack["@r"] = returnStack[returnStack.length - 1];
}

const Token = require('./token.js').Token;
//function to parse an expression usibf the shunting yard algorithm
function parseExpression(expression) {
    //split the expression into tokens
    var tokens = expression.split(/\s+/);
    var outputQueue = [];
    var operatorStack = [];
    var operators = {
        "^": {
            precedence: 4,
            associativity: "Right"
        },
        "%" : {
            precedence: 3,
            associativity: "Left"
        },
        "/": {
            precedence: 3,
            associativity: "Left"
        },
        "*": {
            precedence: 3,
            associativity: "Left"
        },
        "+": {
            precedence: 2,
            associativity: "Left"
        },
        "-": {
            precedence: 2,
            associativity: "Left"
        }
    }
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token == " ") {
            continue;
        }
        if (token == "(") {
            operatorStack.push(token);
        } else if (token == ")") {
            while (operatorStack[operatorStack.length - 1] != "(") {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.pop();
        } else if (token in operators) {
            var o1 = token;
            var o2 = operatorStack[operatorStack.length - 1];
            while (o2 in operators && ((operators[o1].associativity == "Left" && operators[o1].precedence <= operators[o2].precedence) || (operators[o1].associativity == "Right" && operators[o1].precedence < operators[o2].precedence))) {
                outputQueue.push(operatorStack.pop());
                o2 = operatorStack[operatorStack.length - 1];
            }
            operatorStack.push(o1);
        } else {
            outputQueue.push(new Token("int", token));
        }
    }
    while (operatorStack.length > 0) {
        outputQueue.push(operatorStack.pop());
    }
    return outputQueue;
}

//function to parse a line of code into a list of tokens
//for each line, the first token is the command, and the rest are arguments
//check the entire line for mathemtical expressions and parse them using the shunting yard algorithm and the parseExpression function
function parseLine(line) {
    //do as above
    line = skipWhitespace(line);
    var tokens = line.split(/\s+/);
    var command = tokens[0];
    var args = [];
    for (var i = 1; i < tokens.length; i++) {
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
        } // use regex to check if token is a number or an identifier
        else if (tokens[i].match(/^[0-9]+$/)) {
            args.push(new Token("int", parseInt(tokens[i])));
        } else if (tokens[i].match(/^[a-zA-Z\*\@]+$/)) {
            args.push(new Token("ident", tokens[i]));
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
function parseArg(arg) {
    //use regex to check if the arg is a number or an identifier or a string literal
    if (arg.match(/^[0-9]+$/)) {
        return new Token("int", parseInt(arg));
    } else if (arg.match(/^[a-zA-Z\*]+$/)) {
        return new Token("ident", arg);
    } else if (arg.match(/^"([^"]*)"/)) {
        return new Token("str", arg.slice(1, arg.length - 1));
    } else {
        return parseExpression(arg);
    }
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
            var labelName = line.split(":")[1].trim();
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


//function to evaluate a program that scans the program for labels and then evaluates each line starting from the main label
function evaluate(program) {
    scan(program);
    //split the program into lines
    program = program.split("\n");
    if (!labels["main"]) {
        return error("No main label found", "EntryError", 0, hint = "Add a main label to your program", hint_quote = ":main");
    }
    currentLine = labels["main"];
    //while loop until an exit an exit command is reached
    while (true) {
        //evaluate the current line
        let res = evaluateLine(program[currentLine]);
        if (res == undefined) {
            //pass
        } else returnStack.push(res);
        if (res == "exit") {
            break;
        }
        //increment the current line
        currentLine++;
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
            error("variable " + arg.value + " is not defined", "NameError", currentLine);
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
function evaluateCommand(command, args) {
    //check if command is in the commands dictionary
    //check if command is exit
    if (command == "exit") {
        return "exit";
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
stack.newln = "\n"
functions.out = function(args) {
    //print the args
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
    //get input from the user
    var input = prompt("")
    //set the variable to the input
    stack[args[0].value] = input;
    return input;
}
specialForms.int = function(args) {
    //set the variable to the input
    stack[args[0].value] = parseInt(prompt(""));
    return stack[args[0].value];
}
specialForms.set = function(args) {
    //set the value of the variable to the value
    m = args[0].value;
    value = evaluateArg(args[1]);
    stack[m] = value;
    return value;
}
specialForms.goto = function(args) {
    //set the current line to the line of the label
    currentLine = labels[args[0].value.split("*")[1]];
    return undefined;
}
specialForms.goto_if = function(args) {
    //if the most recent return value is true, set the current line to the line of the label
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
functions.stack = function(args) {
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
specialForms.label = function(args) {
    //add the label to the labels dictionary
    n = args[0].value.split("*")[1];
    labels["@l"] = labels[n]
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

module.exports.evaluate = evaluate;
module.exports.scanProgram = require("./scanner.js");