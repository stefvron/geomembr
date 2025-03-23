import { Mode, svgNS } from "./mode.js";

export class CountryNamesMode extends Mode {
    constructor(onInit) {
        super(() => { });
        this.questions = [];
        this.index = 0;
        this.initialised = false;
        this.initQuestions().then(x => {
            this.questions = x;
            onInit();
        });
    }

    getMap() {
        return "./assets/maps/world-2.svg";
    }

    hasNextQuestion() {
        return this.questions.length > this.index;
    }

    nextQuestion() {
        let question = document.createElement("span");
        question.innerHTML = this.questions[this.index++][0];
        return question;
    }

    checkAnswer(answer) {
        return this.questions[this.index-1][1] == answer;
    }

    getAnswer() {
        return this.questions[this.index-1][1];
    }

    getScope() {
        return this.questions.map(x => x[1]);
    }
    getMapTag(code) {
        let tag = document.createElement("span");
        tag.innerHTML = this.questions.find(x => x[1] == code)[0];
        return tag;
    }

    async initQuestions() {
        let questReq = await fetch("./assets/questions/countryNames.txt");
        let questions = await questReq.text();
        questions = questions.split("\n");
        for(let i = 0; i < questions.length; i++) {
            questions[i] = questions[i].split(";")
        }
        this.index = 0;
        questions = questions.filter(x => x[0] != "");
        super.shuffle(questions);
        return questions;
    }
}
