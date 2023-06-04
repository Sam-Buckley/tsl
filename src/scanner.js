const error = require("./error.js").error;
const summary = require("./error.js").summary;
function scanProgram(program) {
    types = "error";
    //check first line, if it starts with #allow, then allow the program to run without checking for errors
    if (program.startsWith("#allow\n#inf")) {
        types = "warn"
        inf = true
    }
    else if (program.startsWith("#inf")) {
        inf = true
    }
    else if (program.startsWith("#allow")) {
        types = "warn"
        inf = false
    } else inf = false
    error_count = 0;
    errors = [];
    //split the program into lines
    templabels = {};
    error_throw = false;
    program = program.split("\n");
    usedLabels = {};
    gotos = {};
    variables = {}
    l = 0;
    //loop through the program
    for (i in program) {
        l += 1;
        line = program[i].trim();
        //if the line defines a variable, through set or in
        if (line.trim().startsWith("set")) {
            //get the variable name
            var variableName = line.split(" ")[1];
            value = line.split(" ")[2];
            if (variableName == undefined) {
                continue
            }
            if (variableName == "_") {
                continue
            }
            //if the variable is already in the variables list, throw an error
            if (variableName in variables) {
                error("Variable " + variableName + " is defined twice", "NameError", i, program[i], variableName, hint = `Variable is already defined on line ${variables[variableName]["line"]}`, hint_quote = `set ${variableName} ${variables[variableName]["value"]}`);
                error_throw = true;
                error_count += 1;
                errors.push(`DoubleDef: ${variableName}`)
            }
            //add the variable to the variables list
            variables[variableName] = {line: l, value: value};
        }
        //if the line is a label, add it to the labels dictionary
        if (line.trim().startsWith(":")) {
            //get the label name
            var labelName = line.split(":")[1].trim().split(" ")[0];
            //if the label is already in the labels dictionary, throw an error
            if (labelName in ["exit"]) {
                //throw error for forbidden label name
                error("Label " + labelName + " is a reserved name", "NameError", l, `:${labelName}`, `:${labelName}`, hint = "Use a different label name", hint_quote = `:end`);
                errors.push(`ReservedLabel: ${labelName}`)
                error_count += 1;
            }
            if (labelName in templabels) {
                error("Label " + labelName + " is defined twice", "NameError", l);
                errors.push(`DoubleDef: ${labelName}`)
                error_throw = true;
                error_count += 1;
            }
            //add the label to the labels dictionary
            templabels[labelName] = i;
        }
        if(line.trim().startsWith("goto_if")) {
            //split the by goto, then by spaces, remove empty strings, and get the label name
            labelName = line.split("goto_if")[1].trim()
            //check if the label is prefixed with a *
            if (labelName.startsWith("*")) {
                labelName = labelName.split("*")[1].trim();
                gotos[labelName] = l;
                usedLabels[labelName] = true;
            } else {
                error("Label " + labelName + " is referenced without a *", "SyntaxError", l - 1, null, null, hint = "Add a * before the label name", hint_quote = "goto_if *" + labelName);
                error_count += 1;
                error_throw = true;
                errors.push(`NoStar: ${labelName}`)
            }
        }
        //if the line is a call to a label, add it to the used labels list
        else if (line.trim().startsWith("gosub_if")) {
            //split the by goto, then by spaces, remove empty strings, and get the label name
            labelName = line.split("gosub_if")[1].trim()
            //check if the label is prefixed with a *
            if (labelName.startsWith("*")) {
                labelName = labelName.split("*")[1].trim();
                gotos[labelName] = l;
                usedLabels[labelName] = true;
            } else {
                error("Label " + labelName + " is referenced without a *", "SyntaxError", l - 1, null, null, hint = "Add a * before the label name", hint_quote = "gosub_if *" + labelName);
                error_count += 1;
                error_throw = true;
                errors.push(`NoStar: ${labelName}`)
            }
        }
        else if (line.trim().startsWith("gosub")) {
             //split the by goto, then by spaces, remove empty strings, and get the label name
            labelName = line.split("gosub")[1].trim()
            //check if the label is prefixed with a *
            if (labelName.startsWith("*")) {
                labelName = labelName.split("*")[1].trim();
                gotos[labelName] = l;
                usedLabels[labelName] = true;
            } else {
                error("Label " + labelName + " is referenced without a *", "SyntaxError", i, null, null, hint = "Add a * before the label name", hint_quote = "gosub *" + labelName);
                error_count += 1;
                error_throw = true;
                errors.push(`NoStar: ${labelName}`)
            }
        }
        //if the line is a call to a label, add it to the used labels list
        else if (line.trim().startsWith("goto")) {
            //split the by goto, then by spaces, remove empty strings, and get the label name
            labelName = line.split("goto")[1].trim()
            //check if the label is prefixed with a *
            if (labelName.startsWith("*")) {
                labelName = labelName.split("*")[1].trim();
                gotos[labelName] = l;
                usedLabels[labelName] = true;
            } else {
                error("Label " + labelName + " is referenced without a *", "SyntaxError", i, null, null, hint = "Add a * before the label name", hint_quote = "goto *" + labelName);
                error_count += 1;
                error_throw = true;
                errors.push(`NoStar: ${labelName}`)
            }
        } 
        if (line.trim().startsWith("label")) {
            //split the by goto, then by spaces, remove empty strings, and get the label name
            labelName = line.split("label")[1].trim()
            //check if the label is prefixed with a *
            if (labelName.startsWith("*")) {
                labelName = labelName.split("*")[1].trim();
                usedLabels[labelName] = true;
                templabels["@l"] = 1;
            } else {
                error("Label " + labelName + " is referenced without a *", "SyntaxError", l - 1, null, null, hint = "Add a * before the label name", hint_quote = "label *" + labelName);
                error_count += 1;
                error_throw = true;
                errors.push(`NoStar: ${labelName}`)
            }
        } if (line.trim().startsWith("call")) {
            //split the by goto, then by spaces, remove empty strings, and get the label name
            labelName = line.split("call")[1].trim()
            //add the label to the used labels list
            usedLabels[labelName] = true;
            templabels["@l"] = 1;
        }
        //check if the line references a label without a *
        //iterate through the labels dictionary and check if the line contains the label name
        for (label in templabels) {
            if (line.startsWith(label)) {
                error("Label " + label + " is referenced without a *", "SyntaxError", l - 1, null, null, hint = "Add a * before the label name", hint_quote = "*" + label);
                error_count += 1;
                error_throw = true;
                errors.push(`NoStar: ${label}`)
            }
        }
    }
    main = false;
    exit = false
    for (i in program) {
        line = program[i];
        if (line.trim().startsWith(":main")) {
            main = true;
        } else if (line.trim().startsWith("exit")) {
            exit = true;
        }
    }
    if (main != true) {
        error("No main label found", "NameError", 0, null, null, hint = "Add a main label to your program", hint_quote = ":main");
        error_count += 1;
        error_throw = true;
        errors.push(`NoMain: main`)
    }
    if (exit != true && inf != true) {
        error("No exit statement found", "NameError", 0, null, null, hint = "Add an exit statement to your program", hint_quote = "exit");
        error_throw = true;
        error_count += 1;
        errors.push(`NoExit: exit`)
    }
    //iterate through the labels dictionary and check if the label is used, if not, throw an error
    for (label in templabels) {
        if(label == "main") {
            continue;
        }
        if (!(label in usedLabels)) {
            error("Label " + label + " is defined but never used", "Dead code", templabels[label], `:${label}`, `:${label}`, hint = "Remove the label", "");
            error_throw = true;
            error_count += 1;
            errors.push(`DeadCode: ${label}`)
        }
    }
    //iterate through the used labels list and check if the label is defined, if not, throw an error
    for (label in usedLabels) {
        if (!(label in templabels)) {
            error("Label " + label + " is used but never defined", "NameError", gotos[label] - 1, `goto *${label}`, `goto *${label}`, hint = "Define the label", hint_quote = `:${label}`);
            error_throw = true;
            error_count += 1;
            errors.push(`NoDef: ${label}`)
        }
    }
    //iterate through the program and check if there are unclosed quotes
    for (i in program) {
        line = program[i];
        if (line.split('"').length % 2 == 0) {
            error("Unclosed quotes", "SyntaxError", i, line.trim(), `"`, hint = "Close the quotes", hint_quote = `${line.trim()}"`);
            error_throw = true;
            error_count += 1;
            errors.push(`UnclosedQuotes: ${i}`)
        }
    }
    //use the summary function to print the summary of the errors
    summary(error_count, types, errors);
    if (types == "error") {
        return error_throw;
    } else {
        return false
    }
}
module.exports = scanProgram;