export const svgNS = "http://www.w3.org/2000/svg";

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
    getMapTag(code) {
        return "";
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
