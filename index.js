const fs = require('fs');
const prompt = require('prompt');

if(! fs.existsSync("out")) {
    fs.mkdirSync("out")
}

let allWords = new String(fs.readFileSync("word-list.txt"))
    .split("\n")
    .map(word => word.toLowerCase());

function emptyLetters() {
    return {a:0, b:0, c:0, d:0, e:0, f:0, g:0, h:0, i:0, j:0, k:0, l:0, m:0, n:0, o:0, p:0, q:0, r:0, s:0, t:0, u:0, v:0, w:0, x:0, y:0, z:0 };
}

function ngramFor(word, index) {
    let bigram;
    if(index == 0) {
        bigram = " "+word.substr(index, 2)
    }
    else if(index == 4) {
        bigram = word.substr(index-1,2)+" "
    }
    else {
        bigram = word.substr(index-1,3);
    }
    return bigram;
}

function prepareCounts(words) {
// count of letter
    var wordCount = words.length;
    var letterCount = wordCount * 5;
    var letterCounts = emptyLetters();
    var letterPositionCounts = [emptyLetters(),emptyLetters(),emptyLetters(),emptyLetters(),emptyLetters()]
    var bigramCounts = {}

    for (let i = 0; i < wordCount; i++) {
        let word = words[i];
        for (let j = 0; j < word.length; j++) {
            let char = word.charAt(j);
            letterCounts[char]++;
            letterPositionCounts[j][char]++;
            let bigram = ngramFor(word, j);
            if(bigramCounts[bigram]) {
                bigramCounts[bigram]++
            } else {
                bigramCounts[bigram] = 1
            }
        }
    }
    var totalBigrams = 0;
    for (let [key, value] of Object.entries(bigramCounts)) {
        totalBigrams += value;
    }
    var pBigrams = {};
    for (let [key, value] of Object.entries(bigramCounts)) {
        pBigrams[key] = value / totalBigrams
    }

    let counts = {
        wordCount:wordCount,
        letterCount:letterCount,
        letterCounts: letterCounts,
        letterPositionCounts: letterPositionCounts,
        pLetterInWord: letterProbability(letterCounts, letterCount),
        pletterInPosition: letterPositionCounts.map(v => letterProbability(v, letterCount)),
        bigramCounts: bigramCounts,
        pBigrams: pBigrams
    }

    return counts;
}

function arrayContainsString(arr, str) {
    for (const arrKey in arr) {
        if(arr[arrKey] == str) {
            return true;
        }
    }
    return false;
}

function letterProbability(letterCounts, totalLetters) {
    let pLetterInWord= emptyLetters();
    for (const [key, value] of Object.entries(letterCounts)) {
        pLetterInWord[key] = value / totalLetters;
    }
    return pLetterInWord;
}
function updateState(state, lastGuess, lastResult) {
    if(state == null) {
        state = {
            guessCount: 0,
            includedLetters: "",
            includedLetterPositions: [],
            excludedLetters: "",
            correctPositionLetters: "     ",
            pwords: [],
            previousGuesses: [],
            nextGuess: null
        }
    }
    if(lastResult == null) {
        lastResult = "     ";
    }
    if(lastGuess == null) {
        lastGuess = "     ";
    }
    let includedLettersArr = state.includedLetters.split("");
    let excludedLettersArr = state.excludedLetters.split("");
    let correctPositionLettersArr = state.correctPositionLetters.split("");

    for (let i = 0; i < 5; i++) {
        if(lastResult.charAt(i) == 'G') {
            correctPositionLettersArr[i] = lastGuess.charAt(i);
        }
        else if(lastResult.charAt(i) == 'Y') {
            includedLettersArr.push(lastGuess.charAt(i));
            state.includedLetterPositions.push(
                {
                    char: lastGuess.charAt(i),
                    pos: i
                });
        } else {
            excludedLettersArr.push(lastGuess.charAt(i));
        }
    }

    let excludedChars = [];
    for (const excludedChar of excludedLettersArr) {
        if(! includedLettersArr.includes(excludedChar)
            && ! correctPositionLettersArr.includes(excludedChar)) {
            excludedChars.push(excludedChar);
        }
    }

    return {
        includedLetters: includedLettersArr.join(""),
        includedLetterPositions: state.includedLetterPositions,
        excludedLetters: excludedChars.join(""),
        correctPositionLetters: correctPositionLettersArr.join(""),
        pwords: [],
        previousGuesses: state.previousGuesses,
        nextGuess: null,
        guessCount: state.guessCount
    }
}

function filterValidWords(state) {
    let filteredWords = [];

    for (let i = 0; i < allWords.length; i++) {
        let word = allWords[i];
        let filterOk = true;

        // if we already guessed this word, don't guess again
        if(arrayContainsString(state.previousGuesses, word)) {
            filterOk = false;
        }
        // this word contains all included letters
        for (const includedChar of state.includedLetters.split("")) {
            if(! word.includes(includedChar)) {
                filterOk = false;
            }
        }

        for (let j = 0; j < 5; j++) {
            let wordChar = word.charAt(j);

            // if we know the letter in the correct position, and
            // this word does not match, filter the word out
            if(state.correctPositionLetters.charAt(j) != " "
                && state.correctPositionLetters.charAt(j) != wordChar) {
                    filterOk = false;
            }

            // if this letter is excluded from the word, filter it
            if(state.excludedLetters.includes(wordChar)) {
                filterOk = false;
            }

            // if this letter id known not to be at this position
            if(state.includedLetters.includes(wordChar)) {
                for (let k = 0; k < state.includedLetterPositions.length; k++) {
                    if(state.includedLetterPositions[k].char == wordChar
                        && state.includedLetterPositions[k].pos == j)
                    filterOk = false;
                }
            }
        }

        if(filterOk) {
            filteredWords.push(word);
        }

    }

    return filteredWords;

}

function hasRepeatedLetters(word) {
    for (let i = 0; i < word.length; i++) {
        if(countLetters(word, word.charAt(i)) > 1) {
            return true;
        }
    }
    return false
}

function countLetters(word, char) {
    let count =0;
    for (let i = 0; i < word.length; i++) {
        if(word.charAt(i) == char) {
            count++;
        }
    }
    return count;
}

function wordProbability(word, updatedCounts, correctPositionLetters){
    let pWord = 1.0;

    for (let j = 0; j < 5; j++) {
        if(correctPositionLetters.charAt(j) != " ") {
            continue;
        }
        let wordChar = word.charAt(j);
        let ngram = ngramFor(word, j);
        pWord = pWord
            * updatedCounts.pBigrams[ngram]
            * updatedCounts.pletterInPosition[j][wordChar]
    }
    return pWord;
}
function sortWords(counts, lastGuess, lastResult, state) {
    state = updateState(state, lastGuess, lastResult);
    let pwords = [];

    // console.log("sorting... ", lastGuess, " lastResult: ", lastResult, " included: ", includedLetters, "excluded: ", excludedLetters);

    let filteredWords = filterValidWords(state)
    let updatedCounts = prepareCounts(filteredWords);
    // console.log("Filtered to "+filteredWords.length+" words")

    for (let i = 0; i < filteredWords.length; i++) {
        let word = filteredWords[i];
        pwords.push({word: word, pWord:wordProbability(word, updatedCounts, state.correctPositionLetters)});
    }

    pwords.sort((a,b) => b.pWord - a.pWord)
    // pick a random word from the top 10%

    // let nextGuess = pwords[Math.floor(Math.random() * pwords.length * .05)];
    // avoid repeated letters in guesses 0 and 1

    let nextGuess = pwords[0];
    // let nextGuess;
    // for (let i = 0; i < pwords.length; i++) {
    //     nextGuess = pwords[i];
    //     if(state.previousGuesses.length < 2 && hasRepeatedLetters(nextGuess) ) {
    //         continue;
    //     } else {
    //         break;
    //     }
    // }


    state.pwords = pwords;
    state.previousGuesses = state.previousGuesses;
    state.nextGuess = nextGuess;

    return state;
}

function testGuesses(expectedWord, guessFunction) {
    // console.log("expected word: ", expectedWord)
    let guesses = 0;
    let result = "     ";
    let guessLog = [];
    for (let i = 0; i < 10; i++) {
        guesses++;
        let nextGuess = guessFunction(result);
        // console.log("Guess:  ", nextGuess)
        result = scoreWords(expectedWord, nextGuess)
        // console.log("Answer: ", result)
        guessLog.push({guess: nextGuess, answer: result});
        if(result == "GGGGG") {
            break;
        }
    }
    return {
        expectedWord: expectedWord,
        guesses: guesses,
        correct: result == "GGGGG" & guesses <= 6 ,
        guessLog: guessLog};
}

function scoreWords(expectedWord, guessWord) {
    let matches = [];
    for (let i = 0; i < 5; i++) {
        if(guessWord.charAt(i) == expectedWord.charAt(i)) {
            matches[i] = 'G'
        } else if(expectedWord.includes(guessWord.charAt(i))) {
            matches[i] = 'Y'
        }  else {
            matches[i] = " "
        }
    }
    return matches.join("");
}

function testBasicProbability() {

    let counts = prepareCounts(allWords);
    let sortedWords = sortWords(counts);
    let sortedWordIndex = 0;
    let guessedCorrectly = testGuesses((lastResult) => {
        return sortedWords[sortedWordIndex++].word;
    })

}

function testRefineProbability(expectedWord) {

    let counts = prepareCounts(allWords);
    let lastGuess = "     ";
    let sortedWords = null;

    let guessedCorrectly = testGuesses(expectedWord, (lastResult) => {
        sortedWords = sortWords(counts, lastGuess, lastResult, sortedWords);
        lastGuess = sortedWords.nextGuess.word
        return sortedWords.nextGuess.word;
    })

    guessedCorrectly.pExpectedWord = wordProbability(guessedCorrectly.expectedWord, counts, "     ");
    return guessedCorrectly
}

function repeatTests() {
    let testCount = 0;
    let successCount = 0;
    let tests = [];
    for (let i = 0; i < 500; i++) {
        testCount++;
        let expectedWord = allWords[Math.floor(Math.random() * allWords.length)];
        let test = testRefineProbability(expectedWord);
        if(test.correct) {
            successCount++;
        }
        tests.push(test)
    }
    console.log("tests: "+testCount+" successes: "+successCount);
    console.log("tests: "+testCount+" successes: "+successCount);
    tests.filter(test => ! test.correct).forEach(test => {
        console.log("failed: ", JSON.stringify(test))
    })
    let correctTests = tests.filter(test => test.guesses <= 6);
    let averageGuesses = tests.reduce((prev,current) => (isFinite(prev) ? prev : 0.0) + current.guesses) / correctTests.length;
    let maxGuesses = tests.reduce((prev,current) => (isFinite(prev) ? Math.max(prev, current.guesses) : 0.0));
    let averagePWord = tests.reduce((prev,current) => (isFinite(prev) ? prev : 0.0) + current.pExpectedWord) / correctTests.length;
    console.log("Average guesses: ", averageGuesses);
    console.log("Max guesses: ", maxGuesses);
    console.log("Average probability: ", averagePWord);
}

function interactive() {
    let counts = prepareCounts(allWords);
    let lastGuess = "     ";
    let sortedWords = null;

    guessFunction = (lastResult) => {
        sortedWords = sortWords(counts, lastGuess, lastResult, sortedWords);
        lastGuess = sortedWords.nextGuess.word
        return sortedWords.nextGuess.word;
    }

    promptForInput = () => {
        prompt.get(['guess ','result'], function (err, result) {
            if (err) {
                return onErr(err);
            }
            if(result.guess == "") {
                lastGuess = nextGuess;
            } else {
                lastGuess = result.guess
            }
            console.log('  Guess: ' + nextGuess);
            console.log('  Result: ' + result.result);
            sortedWords.previousGuesses.push(result.guess)

            nextGuess = guessFunction(result.result)
            console.log("Proposed guess: ",nextGuess);

            promptForInput()
        });
    }

    function onErr(err) {
        console.log(err);
        return 1;
    }

    prompt.start();
    console.log("Proposed first guess: ", guessFunction("     "));
    promptForInput()
}

repeatTests();

// interactive()
