import { CountryNamesMode } from "./modes/countryNames.js";

const svgNS = "http://www.w3.org/2000/svg";
const minCountrySize = 5.5;

let dragging = false;
let moved = false;
let lastClientX = 0;
let lastClientY = 0;
let lastDistance = 0;
let zoomLevel = 1;
let fails = 0;
let guessMode = null;

async function init() {
    document.addEventListener("gesturestart", event => {
        event.preventDefault();
    });
    document.addEventListener("gesturechange", event => {
        event.preventDefault();
    });
    start("cn");
}
window.init = init;

async function start(mode) {
    guessMode = new CountryNamesMode(() => {
        initMap();
        nextQuestion();
    });
}
window.start = start;

async function initMap() {
    let mapC = document.getElementById("map-container");
    let map = await fetch(guessMode.getMap());
    mapC.innerHTML = await map.text();
    
    let mapSVG = document.getElementById("map");

    let paths = mapSVG.children;
    for(let i = 0; i < paths.length; i++) {
        let pBox = paths[i].getBBox();
        if(pBox.width < minCountrySize || pBox.height < minCountrySize) {
            if(paths[i].classList.contains(paths[i].id)) {
                let pX = pBox.x + pBox.width / 2;
                let pY = pBox.y + pBox.height / 2;
                let node = document.createElementNS(svgNS, "circle");
                node.setAttribute("cx", pX);
                node.setAttribute("cy", pY);
                node.setAttribute("r", minCountrySize/2);
                node.classList.add(paths[i].classList[0]);
                node.classList.add("countryDot");
                mapSVG.appendChild(node);
            }
        }
        paths[i].style.strokeWidth = "1px";
        paths[i].addEventListener("mouseenter", event => {
            event.target.classList.add("highlightedCountry");
            let country = document.getElementsByClassName(event.target.classList[0]);
            for(let j = 0; j < country.length; j++) {
                country[j].classList.add("highlightedCountry");
            }
        });
        paths[i].addEventListener("mouseleave", event => {
            event.target.classList.remove("highlightedCountry");
            let country = document.getElementsByClassName(event.target.classList[0]);
            for(let j = 0; j < country.length; j++) {
                country[j].classList.remove("highlightedCountry");
            }
        });
    }

    mapSVG.style.left = 0;
    mapSVG.style.top = document.getElementsByTagName("header")[0].clientHeight;

    mapC.addEventListener("mousedown", event => {
        dragging = true;
        moved = false;
    });
    mapC.addEventListener("touchstart", event => {
        if(event.touches.length == 1) {
            dragging = true;
            moved = false;
            lastClientX = event.touches[0].clientX;
            lastClientY = event.touches[0].clientY;
        } else if(event.touches.length == 2) {
            let dx = event.touches[0].clientX - event.touches[1].clientX;
            let dy = event.touches[0].clientY - event.touches[1].clientY;
            lastDistance = Math.sqrt(dx**2 + dy**2);
        }
    });
    mapC.addEventListener("mouseup", event => {
        dragging = false;
        if(!moved) {
            if(event.target.id != "map" && event.target.id != "map-container") {
                checkAnswer(event.target.classList[0]);
            }
        }
    });
    mapC.addEventListener("touchend", event => {
        if(event.touches.length == 1) {
            dragging = false;
            if(!moved) {
                if(event.target.id != "map" && event.target.id != "map-container") {
                    checkAnswer(event.target.classList[0]);
                }
            }
        }
    });
    mapC.addEventListener("mousemove", event => {
        dragMap(event.movementX, event.movementY);
        moved = true;
    });
    mapC.addEventListener("touchmove", event => {
        if(event.touches.length == 1) {
            let moveX = event.touches[0].clientX - lastClientX;
            lastClientX = event.touches[0].clientX;
            let moveY = event.touches[0].clientY - lastClientY;
            lastClientY = event.touches[0].clientY;

            dragMap(moveX, moveY);
            moved = true;
        } else if(event.touches.length == 2) {
            let dx = event.touches[0].clientX - event.touches[1].clientX;
            let dy = event.touches[0].clientY - event.touches[1].clientY;
            let newDistance = Math.sqrt(dx**2 + dy**2);
            let zoom = newDistance/lastDistance;
            lastDistance = newDistance;
            zoomMap(zoom);
        }
    });
    mapC.addEventListener("wheel", event => {
        let zoom = 1;
        if(event.deltaY > 0) zoom = 1.1;
        else zoom = 0.9;
        zoomMap(zoom);
    });
}
function dragMap(mx, my) {
    let mapSVG = document.getElementById("map");
    if(dragging) {
        let newLeft = (parseInt(mapSVG.style.left, 10) + mx/zoomLevel);
        let newTop = (parseInt(mapSVG.style.top, 10) + my/zoomLevel);
        mapSVG.style.left = newLeft + "px";
        mapSVG.style.top = newTop + "px";
        mapSVG.style.transformOrigin = "calc(50% - " + newLeft + "px) calc(50% - " + newTop + "px)";
    }
}
function zoomMap(zoom) {
    zoomLevel *= zoom;
    zoomLevel = Math.max(zoomLevel, 1);
    let mapSVG = document.getElementById("map");
    mapSVG.style.transform = "scale(" + zoomLevel + ")";
    let circleR = minCountrySize * (1/Math.min(3, zoomLevel));
    let circles = document.getElementsByTagName("circle");
    for(let i = 0; i < circles.length; i++) {
        circles[i].setAttribute("r", circleR);
    }
    let paths = mapSVG.children;
    for(let i = 0; i < paths.length; i++) {
        paths[i].style.strokeWidth = (1/zoomLevel) + "px";
    }
    return;
}

function nextQuestion() {
    fails = 0;
    if(!guessMode.hasNextQuestion()) return;
    document.getElementById("guess-box").innerHTML = guessMode.nextQuestion();
}

function checkAnswer(answer) {
    let answerNodes = document.getElementsByClassName(answer);
    if(answerNodes[0].classList.contains("correct") || answerNodes[0].classList.contains("failed")) return;
    if(guessMode.checkAnswer(answer)) {
        for(let i = 0; i < answerNodes.length; i++) {
            answerNodes[i].classList.add("correct");
            answerNodes[i].classList.add("failed-" + fails);
        }
        nextQuestion();
    } else {
        fails++;
        if(fails > 3) {
            answerNodes = document.getElementsByClassName(guessMode.getAnswer());
            for(let i = 0; i < answerNodes.length; i++) {
                answerNodes[i].classList.add("failed");
            }
            nextQuestion();
        }
    }
}
