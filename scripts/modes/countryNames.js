import { Mode } from "./mode.js";

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
        return "<span>" + this.questions[this.index++][0] + "</span>";
    }

    checkAnswer(answer) {
        return this.questions[this.index-1][1] == answer;
    }

    async initQuestions() {
        let questReq = await fetch("./assets/questions/countryNames.txt");
        let questions = await questReq.text();
        questions = questions.split("\n");
        for(let i = 0; i < questions.length; i++) {
            questions[i] = questions[i].split(";")
        }
        this.index = 0;
        super.shuffle(questions);
        return questions;
    }
}
