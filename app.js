console.log("Hi")

button1 = document.querySelector(".button1")
button2 = document.querySelector(".button2")

function getComputerChoice() {
	let a = Math.random()
	let choice =  ""
	if (a <= 0.3) {
		choice = "rock"
	}
	else if (a <= 0.6) {
		choice = "paper"
	}
	else {
		choice = "scissors"
	};
	return choice
};


function getHumanChoice() {
	let input = prompt("Enter Rock, Paper or Scissors; ").toLowerCase()
	let choice = ""
	if (input === "rock" || input === "scissors" || input === "paper") {
		choice = input;
	}
	else {
		alert("ENTER 'Rock', 'Paper' OR 'Scissors' TO MAKE A CHOICE")
		getHumanChoice()
	};
	return choice;
};

function humanWin() {
	humanScore++;
	console.log(`You  won.  \n Current Scores; \n Computer: ${computerScore} \n Your Current Score: ${humanScore}`);
}


function computerWin() {
	computerScore++;
	console.log(`Computer won. Try again \n Current Scores; \n Computer: ${computerScore} \n You Current Score: ${humanScore}`);
}


let humanScore =  0;
let computerScore = 0;
let rounds = 5;
button1.innerHTML = "START"
button2.style.display = "none"


function reset() {
	humanScore = 0;
	computerScore = 0;
	rounds = 5;
	button1.innerHTML = "PLAY AGAIN"
	button2.style.display = "none"
}

function checkState() {
	if (rounds === 0) {
	    console.log(`GAME DONE! \n YOUR FINAL SCHOOL: ${humanScore} \n COMPUTER'S SCORE: ${computerScore}`);
	    if (humanScore > computerScore) {
	        console.log("You win");
	    }
	    else if (humanScore === computerScore) {
	        console.log("IT WAS A TIE! TRY AGAIN");
	    }
	    else {
	        console.log("Game lost. Try again");
	    }
	    
	    reset();
	}
	else {
	    console.log(`You have ${rounds} rounds left.`);
	}
}

function playRound(humanChoice = getHumanChoice(), computerChoice = getComputerChoice()) {


	console.log(`Your Choice: ${humanChoice} \n Computer chose: ${computerChoice}`)
	
	if (humanChoice === computerChoice) {
		console.log("It's a tie, try again")
	}
	else if (humanChoice === "scissors") {
		if (computerChoice === "rock") {
			computerWin()
		}
		else if (computerChoice === "paper") {
			humanWin()
		};
	}
	else if (humanChoice === "rock") {
		if (computerChoice === "scissors") {
			humanWin()
		}
		else if (computerChoice === "paper") {
			computerWin()
		};
	}
	else if (humanChoice === "paper") {
		if (computerChoice === "scissors") {
			computerWin()
		}
		else if (computerChoice === "rock") {
			humanWin()
		};
	};
	rounds --
	checkState()
}

function playGame() {
	console.log(`ROCK PAPER SCISSORS! \n Game on! \n You got ${rounds} rounds left!`)
	button1.innerHTML = "RESTART"
	button2.innerHTML = "CLICK TO MAKE FIRST CHOICE"
	button2.style.display = "block"
	
	button2.addEventListener("click", () => {
	playRound()
	button2.innerHTML = "CLICK TO MAKE NEXT CHOICE"
	});
};



button1.addEventListener("click", () => {
	playGame()
});

