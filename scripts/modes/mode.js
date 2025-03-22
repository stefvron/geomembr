export class Mode{
    constructor(onInit) {
        onInit();
    }
    getMap() {
        return "";
    }
    hasNextQuestion() {
        return false;
    }
    nextQuestion() {
        return "";
    }
    checkAnswer(answer) {
        return true;
    }
    getAnswer() {
        return "";
    }
    getScope() {
        return [];
    }
    shuffle(arr) {
        let i = arr.length;
        while(i != 0) {
            let randI = Math.floor(Math.random() * i);
            i--;
            [arr[i], arr[randI]] = [arr[randI], arr[i]];
        }
    }
}
