//IIFE
(function($){
    // an array to hold the letters of the word in the current guess. This doesn't need to be saved
    let guess = [];
    // all words in the dictionary
    let words;
    // just a key to store the localStorage by
    const LOCAL_STORAGE_KEY='gameData';
    // wrap the game data in a json literal for localStorage purposes
    let stateJSON = {
        // an array to hold the gueses
        guesses:[],
        /*
            an int to hold the current guess index
            This is used with the jQuery selector #guess_${guessIndex} to figure out what row in the DOM to check
         */
        guessIndex:0,
        // This is an array to store the guess results. It's used exlusively for storing to and loading from localStorage
        guessStateArray:[],
        // a hash for the state of all letter guesses
        letterGuesses:{},
        // the word of the day
        word:'',
        // a hash of the word
        wordHash:{},
        // Mostly just a flag to stop the keydown event
        won:false,
        // to hold the guess history
        guessHistory:{1:0,2:0,3:0,4:0,5:0,6:0,losses:0}
    };
    let $modal;
    // jquery powered onload event
    $(()=>{
        $modal=$('#winModal');
        // build the array of letters
        for(let i = 65; i < 91; i++)
        {
            stateJSON.letterGuesses[String.fromCharCode(i)]=null;
        }
        // fetch the dictionary
        $.getJSON('./dict.json',function(data){
            //generate the PRNG value for the day
            let now = Math.floor(Date.now() / 86400000);
            Math.seedrandom(now);
            let wordIndex = Math.floor(Math.random() * data.length);
            stateJSON.now = now;

            // store the json array locally, which we need to do to ensure that the guess exists in the dictionary
            // then store the word of the day
            words = data;
            stateJSON.word = data[wordIndex];
            // convert the string to a hash of the positions
            for(let i = 0; i < stateJSON.word.length; i++)
            {
                stateJSON.wordHash[stateJSON.word[i]]=stateJSON.wordHash[stateJSON.word[i]]?stateJSON.wordHash[stateJSON.word[i]]:[];
                stateJSON.wordHash[stateJSON.word[i]].push(i);
            }
            // do the localstorage stuff
            onboardLocalStorage();
            // handle the keybind stuff
            $(document).keydown(handleKeyStroke);
        });
    });

    function onboardLocalStorage()
    {
        // get the data as raw text
        let rawLSData = localStorage.getItem(LOCAL_STORAGE_KEY);
        // if we have data, parse it
        if(rawLSData)
        {
            // convert it from binary to ascii and from a string to a JSON literal
            let jsonLSData = JSON.parse(atob(rawLSData));
            if(stateJSON.now === jsonLSData.now)
            {
                stateJSON = jsonLSData;
                // fill in the guesses in the guess grid
                for(let i = 0; i < stateJSON.guesses.length; i++)
                {
                    let guess = stateJSON.guesses[i];
                    let state = stateJSON.guessStateArray[i];
                    $(`#guess_${i} .letterContainer`).each(function(j){
                        // set the class
                        let $row = $(this).addClass(state[j]);
                        // set the text
                        $('.letter', $row).text(guess[j]);
                    });
                }
                for(const [key, value] of Object.entries(stateJSON.letterGuesses))
                {
                    if(value)
                    {
                        $(`.key:contains(${key})`).addClass(value);
                    }
                }
            }
        }
        if(stateJSON.won)
        {
            showVictorySplash();
        }
    }

    function handleKeyStroke(data)
    {
        if(stateJSON.won)
        {
            return;
        }
        $(`#guess_${stateJSON.guessIndex} .letterContainer`).removeClass('mistake right halfright wrong');
        let char = data.which;
        if (char >= 65 && char <= 90) {
            // letter
            // make sure the guess has fewer than five letters
            if (guess.length < 5) {
                // add the letter to the guess
                guess.push(String.fromCharCode(char));
                // update the current guess
                updateCurrentGuess();
            }
        } else if (char === 8) {
            // backspace
            // Make sure that the current guess is not marked as invalid because it is no longer a guess
            $('.mistake').removeClass('mistake');
            // make sure the guess has at least one letter
            if (guess.length > 0) {
                // remove the last letter from the guess
                guess.pop();
                // update the current guess
                updateCurrentGuess();
            }
        } else if (char === 13) {
            // enter
            // make sure the guess has five letters
            if (guess.length === 5) {
                // make the guess
                makeGuess();
            }
        }
    }

    function makeGuess()
    {
        let guessAsString = guess.join('');
        // make sure the guess is in the dictionary
        if(words.indexOf(guessAsString)<0)
        {
            // if not, mark the guess as invalid.
            $(`#guess_${stateJSON.guessIndex} .letterContainer`).addClass('mistake');
            return;
        }
        let correctLetters=0;
        stateJSON.guesses.push(guess);
        let guessState = [];
        for(let i = 0; i < guess.length; i++)
        {
            // get the letter by index
            let letter=guess[i];
            // get the element for the letter in the guess
            let $elem = $(`#guess_${stateJSON.guessIndex} .letterContainer`).eq(i);
            // get the element for the letter on the keyboard
            let $key = $(`.key:contains(${letter})`);
            // an array to hold the state of guesses for this word
            let letterResult = 'wrong';
            // check if the letter is in the hash
            if(stateJSON.wordHash[letter])
            {
                // check for letter position and if it's right, set it in the right position, otherwise it's halfright.
                letterResult = (stateJSON.wordHash[letter].indexOf(i)>=0)?'right':'halfright';
                stateJSON.letterGuesses[letter] = (stateJSON.letterGuesses[letter]==='right')?'right':letterResult;
                if(letterResult === 'right')
                {
                    correctLetters++;
                }
            }
            else
            {
                stateJSON.letterGuesses[letter]='wrong';
                letterResult = 'wrong';
            }
            guessState.push(letterResult);
            $elem.addClass(letterResult);
            $key.addClass(stateJSON.letterGuesses[letter]);
        }
        // increase the index of guesses by one and save everything
        stateJSON.guessIndex++;
        stateJSON.guessStateArray.push(guessState);
        // figure out if we won.
        if(correctLetters === stateJSON.word.length)
        {
            stateJSON.won = true;
            stateJSON.guessHistory[stateJSON.guessIndex]++;
            showVictorySplash();
        }
        else
        {
            // clear the guess
            guess = [];
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, btoa(JSON.stringify(stateJSON)));
    }

    function showVictorySplash()
    {
        $('#results .row').each(function(i){
            let $div =$(':nth-child(3)', $(this));
            $div.text(stateJSON.guessHistory[i+1]);
        });
        $modal.modal('show');
    }

    function updateCurrentGuess()
    {
        $(`#guess_${stateJSON.guessIndex} .letter`).empty().each(function(i){
            $(this).text(guess[i]);
        });
    }
})(window.jQuery);