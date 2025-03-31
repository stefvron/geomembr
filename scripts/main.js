import { CountryNamesMode } from "./modes/countryNames.js";
import { TerritoryNamesMode } from "./modes/territoryNames.js";
import { TldMode } from "./modes/tlds.js";
import { getAreaFromPath } from "./utils.js";

const svgNS = "http://www.w3.org/2000/svg";
const minCountrySize = 5.5;
const guessModes = {
    "Countries": CountryNamesMode,
    "Territories": TerritoryNamesMode,
    "TLDs/Domain-Endings": TldMode,
};

let dragging = false;
let moved = false;
let lastClientX = 0;
let lastClientY = 0;
let lastDistance = 0;

let mapX = 0;
let mapY = 0;
let zoomLevel = 1;

let fails = 0;
let guessMode = null;
let abortController = new AbortController();

async function init() {
    guessMode = null;

    document.addEventListener("gesturestart", event => {
        event.preventDefault();
    });
    document.addEventListener("gesturechange", event => {
        event.preventDefault();
    });
    initModeSelection();
}
window.init = init;

function initModeSelection() {
    let modeSelect = document.getElementById("mode-selection");
    modeSelect.childNodes.forEach(c => {
        if(c.value != "none") modeSelect.removeChild(c);
    });
    Object.entries(guessModes).forEach(m => {
        let k = m[0];
        let opt = document.createElement("option");
        opt.value = k;
        opt.innerHTML = k;
        modeSelect.appendChild(opt);
    });
    modeSelect.addEventListener("change", select);

    function select(event) {
        abortController.abort();
        switch(modeSelect.value) {
            case "none":
                break;
            default:
                start(guessModes[modeSelect.value]);
                break;
        }
    }
}

async function start(mode) {
    fails = 0;
    
    guessMode = new mode(() => {
        initHeader();
        initMap();
        nextQuestion();
    });
}
window.start = start;

let perc = 0;
let seconds = 0;
let abortHeader = new AbortController();
function initHeader() {
    abortHeader = new AbortController();
    perc = 0;
    seconds = 0;

    let headerPercent = document.getElementById("main-header-percentage");
    headerPercent.innerHTML = perc;
    let headerTime = document.getElementById("main-header-timer");
    headerTime.innerHTML = formatTime(seconds);

    let clock = setInterval(() => {
        seconds++;
        headerTime.innerHTML = formatTime(seconds);
    }, 1000);
    abortHeader.signal.addEventListener("abort", event => {
        clearInterval(clock);
    });

    function formatTime(sec) {
        let minutes = Math.floor(sec / 60);
        let seconds = sec % 60;
        if(seconds < 10) seconds = "0" + seconds;
        return minutes + ":" + seconds;
    }
}
function addPerc(p) {
    perc += p;
    let headerPercent = document.getElementById("main-header-percentage");
    headerPercent.innerHTML = perc.toFixed(2);
}

async function initMap() {
    dragging = false;
    moved = false;
    lastClientX = 0;
    lastClientY = 0;
    lastDistance = 0;
    
    mapX = 0;
    mapY = 0;
    zoomLevel = 1;
    
    let mapC = document.getElementById("map-container");
    let map = await fetch(guessMode.getMap());
    mapC.innerHTML = await map.text();
    
    let mapSVG = document.getElementById("map");

    initMapHandlers();

    mapSVG.style.left = 0;
    mapSVG.style.top = document.getElementsByTagName("header")[0].clientHeight;
    mapX = (innerWidth-mapSVG.clientWidth) / 2;
    placeMap();

}
function initMapHandlers() {
    abortController = new AbortController();
    let mapC = document.getElementById("map-container");
    let mapSVG = document.getElementById("map");
    const minArea = (mapSVG.viewBox.baseVal.width / mapSVG.clientWidth) * (minCountrySize**2);
    const scope = guessMode.getScope();
    let paths = mapSVG.children;
    for(let i = 0; i < paths.length; i++) {
        if(!scope.includes(paths[i].classList[0])) {
            paths[i].classList.add("disabledCountry");
            continue;
        }
        
        const area = getAreaFromPath(paths[i]);
        let pBox = paths[i].getBBox();

        if(area < minArea|| pBox.width < minCountrySize || pBox.height < minCountrySize) {
            if(paths[i].classList.contains(paths[i].id)) {
                let node = document.createElementNS(svgNS, "circle");
                node.setAttribute("cx", getCentreOfPath(paths[i]).x);
                node.setAttribute("cy", getCentreOfPath(paths[i]).y);
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
    mapC.addEventListener("mousedown", mouseDownHandler, {signal: abortController.signal});
    mapC.addEventListener("touchstart", touchStartHandler, {signal: abortController.signal});
    mapC.addEventListener("mouseup", mouseUpHandler, {signal: abortController.signal});
    mapC.addEventListener("touchend", mouseUpHandler, {signal: abortController.signal});
    mapC.addEventListener("mousemove", mouseMoveHandler, {signal: abortController.signal});
    mapC.addEventListener("touchmove", touchMoveHandler, {signal: abortController.signal});
    mapC.addEventListener("wheel", wheelHandler, {signal: abortController.signal});


    function mouseDownHandler(event) {
        dragging = true;
        moved = false;
    }
    function touchStartHandler(event) {
        if(event.touches.length == 1) {
            mouseDownHandler(event);
            lastClientX = event.touches[0].clientX;
            lastClientY = event.touches[0].clientY;
        } else if(event.touches.length == 2) {
            moved = true;
            let dx = event.touches[0].clientX - event.touches[1].clientX;
            let dy = event.touches[0].clientY - event.touches[1].clientY;
            lastDistance = Math.sqrt(dx**2 + dy**2);
        }
    }
    function mouseUpHandler(event) {
        dragging = false;
        if(!moved) {
            if(event.target.id != "map" && event.target.id != "map-container") {
                checkAnswer(event.target.classList[0]);
            }
        }
    }
    function mouseMoveHandler(event) {
        dragMap(event.movementX, event.movementY);
        moved = true;
    }
    function touchMoveHandler(event) {
        event.preventDefault();
        moved = true;
        if(event.touches.length == 1) {
            let moveX = event.touches[0].clientX - lastClientX;
            lastClientX = event.touches[0].clientX;
            let moveY = event.touches[0].clientY - lastClientY;
            lastClientY = event.touches[0].clientY;

            dragMap(moveX, moveY);
        } else if(event.touches.length == 2) {
            let dx = event.touches[0].clientX - event.touches[1].clientX;
            let dy = event.touches[0].clientY - event.touches[1].clientY;
            let newDistance = Math.sqrt(dx**2 + dy**2);
            let zoom = newDistance/lastDistance;
            lastDistance = newDistance;
            let lX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            let lY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            zoomMap(zoom, lX, lY);
        }
    }
    function wheelHandler(event) {
        let zoom = 1;
        if(event.deltaY > 0) zoom = 1.1;
        else zoom = 0.9;
        zoomMap(zoom, event.clientX, event.clientY);
    }
}
function dragMap(mx, my) {
    if(dragging) {
        mapX += mx / zoomLevel;
        mapY += my / zoomLevel;
    }
    placeMap();
}
function zoomMap(zoom, lX, lY) {
    let mapC = document.getElementById("map-container");
    let mapSVG = document.getElementById("map");

    let oldZoom = zoomLevel;
    zoomLevel *= zoom;
    zoomLevel = Math.max(zoomLevel, 1);
    if(zoomLevel == oldZoom) return;

    lX -= mapC.clientTop;
    lY -= mapC.clientLeft;

    let lW = Math.min(mapC.clientWidth, mapSVG.clientWidth);
    let lH = Math.min(mapC.clientHeight, mapSVG.clientHeight);

    mapX -= (lX - lW/2)/oldZoom -
        (lX - lW/2)/zoomLevel;
    mapY -= (lY - lH/2)/oldZoom -
        (lY - lH/2)/zoomLevel;

    let circleR = minCountrySize * (1/Math.min(1.5, zoomLevel)) / 2;
    let circles = document.getElementsByTagName("circle");
    for(let i = 0; i < circles.length; i++) {
        circles[i].setAttribute("r", circleR);
    }
    let paths = mapSVG.children;
    for(let i = 0; i < paths.length; i++) {
        paths[i].style.strokeWidth = (1/zoomLevel) + "px";
    }

    placeMap();
}
function placeMap() {
    let mapSVG = document.getElementById("map");

    mapSVG.style.transform = "scale(" + zoomLevel + ") " +
        "translate(" + mapX + "px, " + mapY + "px)";
}

function nextQuestion() {
    fails = 0;
    if(!guessMode.hasNextQuestion()) {
        document.getElementById("guess-box").innerHTML = "<span>Finished!</span>";
        document.getElementById("mode-selection").value = "none";
        abortHeader.abort();
        return;
    };
    document.getElementById("guess-box").innerHTML = "";
    document.getElementById("guess-box").appendChild(guessMode.nextQuestion());
}

function checkAnswer(answer) {
    let answerNodes = document.getElementsByClassName(answer);
    if(answerNodes[0].classList.contains("correct") ||
        answerNodes[0].classList.contains("failed") ||
        answerNodes[0].classList.contains("disabledCountry")
    ) return;
    if(guessMode.checkAnswer(answer)) {
        for(let i = 0; i < answerNodes.length; i++) {
            answerNodes[i].classList.add("correct");
            answerNodes[i].classList.add("failed-" + fails);
        }
        addPerc(1 / guessMode.getScope().length / (fails + 1) * 100);
        nextQuestion();
    } else {
        let helpNode = guessMode.getMapTag(answer);
        helpNode.classList.add("helpNode");
        document.getElementById("fail-box").innerHTML = "";
        document.getElementById("fail-box").appendChild(helpNode);
        removeElementAfterMs(helpNode, 2000);

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

function removeElementAfterMs(node, ms) {
    setTimeout(() => {
        node.remove();
    }, ms);
}

function getCentreOfPath(path) {
    let pBox = path.getBBox();

    let pX = pBox.x + pBox.width / 2;
    let pY = pBox.y + pBox.height / 2;
    if(path.getAttribute("cx")) 
        pX = path.getAttribute("cx");
    if(path.getAttribute("cy"))
        pY = path.getAttribute("cy");
    return {x: pX, y: pY};
}
