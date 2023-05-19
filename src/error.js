const errors = Object.create(null)
errors.errors = []
//function to handle errors, with colours and all
exports.error = function error(message, type, currentLine, code = null, quote = null, hint = null, hint_quote = null) {
    //print <type> at <line number>: <message>
    //include colours
    //type is of LabelError, SyntaxError, etc.
    if (!currentLine) {
        currentLine = 0;
    }
    console.log("\x1b[31m%s\x1b[0m", type + " at line " + (parseInt(currentLine) + 1) + ": " + message);
    //find out where the error is from the code and error type, then print the code with the error highlighted
    if (code) {
        //print the code in a nice format, with the error highlighted in red (the quote is to be highlighted)
        index = code.indexOf(quote);
        if (index == -1) {
            index = 0;
        }
        printed = "Error Occurred Here: " + code;
        //log the code with the error highlighted red and the rest of the code highlighted white
        console.log("" + "\x1b[37m%s\x1b[0m", code.substring(0, index) + "\x1b[31m" + `${code.substring(index, index + quote.length)}` + "\x1b[37m" + code.substring(index + quote.length, code.length));
        //using printed variable, place arrows under the error and print it
        console.log(" ".repeat(index) + "\x1b[31m%s\x1b[0m", "^".repeat(quote.length));
    }
    if (hint) {
        //print the hint in a nice format, with the hint_quote highlighted in green
        index = hint.indexOf(hint_quote);
        if (index == -1) {
            index = 0;
        }
        if (hint_quote) {
            console.log("\x1b[37m%s\x1b[0m", "Hint: " + hint + "\x1b[32m" + "\n" + hint_quote);
        } else {
            console.log("\x1b[37m%s\x1b[0m", "Hint: " + hint);
        }
    }
    console.log()
}
exports.summary = function summary(count, warn_or_error, errors) {
    //check if error is warn or error
    if (warn_or_error == "warn") {
        //iterate through the errors and print the type
        console.log("\x1b[33m%s\x1b[0m", "Compiler Found " + count + " Warnings");
        for (i in errors) {
            console.log("\x1b[33m%s\x1b[0m", "" + (parseInt(i) + 1) + ": " + errors[i]);
        }
    } else {
        if (count == 0) {
            console.log("\x1b[32m%s\x1b[0m", "No Errors Found\n");
            return;
        }
        //iterate through the errors and print the type
        console.log("\x1b[31m%s\x1b[0m", "Compiler Found " + count + " Errors");
        for (i in errors) {
            console.log("\x1b[31m%s\x1b[0m", "" + (parseInt(i) + 1) + ": " + errors[i]);
        }
    }
    console.log()
}