
//DIVs
startGameDiv = document.querySelector("#start-game")
gamePlayDiv = document.querySelector("#game-play-div")
humanScoreDiv = document.querySelector("#human-score")
computerScoreDiv = document.querySelector("#computer-score")
gameOverDiv = document.querySelector("#game-over-div")
scoreBoard = document.querySelector("#score-board")

//BUTTONS
playButton = document.querySelector("#play-btn")
optionButtons = document.querySelectorAll(".option-btn")
playAgainButton = document.querySelector("#game-over-div > button")

//DISPLAYS
//Choice Displays
humanChoiceDisplay = document.querySelector("#human-choice")
computerChoiceDisplay = document.querySelector("#computer-choice")
//Single Round Result Display
roundResultDisplay = document.querySelector("#round-result")
//Game Over Display
gameOverPara = document.querySelector("#game-over-div > p")
//App Heading Display
appTitle = document.querySelector("h1")

//BUTTON ACTS
//Button function to start game
playButton.addEventListener("click", () => {
	startGameDiv.classList.toggle("hide")
	gamePlayDiv.classList.toggle("hide")
})

//Button for getting Human Choice and Playing a Round
optionButtons.forEach((button) => {
	button.addEventListener("click", () => {
		playRound(button.id.toUpperCase())
	})
})

//Button to Restart Game When Game Over
playAgainButton.addEventListener("click", () => {
	gameOverDiv.classList.toggle("hide")
	appTitle.classList.toggle("hide")
	startGameDiv.classList.toggle("hide")
})


let choiceEmojis = {
	'ROCK': "🪨",
	'PAPER': "🧻",
	'SCISSORS': "✂️",
}

console.log(choiceEmojis.PAPER, choiceEmojis.SCISSORS)

function getComputerChoice() {
	let a = Math.random()
	let choice =  ""
	if (a <= 0.3) {
		choice = "ROCK"
	}
	else if (a <= 0.6) {
		choice = "PAPER"
	}
	else {
		choice = "SCISSORS"
	};
	return choice
};


function humanWin() {
	humanScore++;
	scoreBoard.style.border = "2px solid lightgreen"
	humanScoreDiv.innerText = `Human Score: ${humanScore}`
	roundResultDisplay.innerText = `You  won. 💪`
}


function computerWin() {
	computerScore++;
	scoreBoard.style.border = "2px solid pink"
	computerScoreDiv.innerText = `Computer Score: ${computerScore}`
	roundResultDisplay.innerText = `Computer won. Try Again ‎😓`
}


let humanScore =  0;
let computerScore = 0;


function reset() {
	humanScore = 0;
	computerScore = 0;
}

function gameOver() {
	gamePlayDiv.classList.toggle("hide")
	appTitle.classList.toggle("hide")
	gameOverDiv.classList.toggle("hide")
}

function checkState() {
	if (humanScore === 5) {
		gameOverPara.innerText = `You won 🎉`
		gameOver()
		reset()
	}
	else if (computerScore === 5) {
		gameOverPara.innerText = `Computer won 🎧    Try Again? 🥲`
		gameOver()
		reset()
	}
}

function playRound(humanChoice, computerChoice = getComputerChoice()) {
	
	humanChoiceDisplay.innerText = `Your Choice: ${choiceEmojis[humanChoice]}`
	computerChoiceDisplay.innerText = `Computer Choice: ‎${choiceEmojis[computerChoice]}`  
	
	
	if (humanChoice === computerChoice) {
		scoreBoard.style.border = "2px solid lightblue"
		roundResultDisplay.innerText = "It's a tie. Try again ‎🧐"
	}
	else if (humanChoice === "SCISSORS") {
		if (computerChoice === "ROCK") {
			computerWin()
		}
		else if (computerChoice === "PAPER") {
			humanWin()
		};
	}
	else if (humanChoice === "ROCK") {
		if (computerChoice === "SCISSORS") {
			humanWin()
		}
		else if (computerChoice === "PAPER") {
			computerWin()
		};
	}
	else if (humanChoice === "PAPER") {
		if (computerChoice === "SCISSORS") {
			computerWin()
		}
		else if (computerChoice === "ROCK") {
			humanWin()
		};
	};
	checkState()
}


