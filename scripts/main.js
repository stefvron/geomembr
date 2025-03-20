async function init() {
    initMap();
}
async function initMap() {
    let mapC = document.getElementById("map-container");
    let map = await fetch("./assets/maps/world.svg");
    mapC.innerHTML = await map.text();

    let paths = document.getElementsByTagName("path");
    for(i = 0; i < paths.length; i++) {
        paths[i].addEventListener("mouseenter", event => {
            event.target.classList.add("highlightedCountry");
            let country = document.getElementsByClassName(event.target.classList[0]);
            for(j = 0; j < country.length; j++) {
                country[j].classList.add("highlightedCountry");
            }
        });
        paths[i].addEventListener("mouseleave", event => {
            event.target.classList.remove("highlightedCountry");
            let country = document.getElementsByClassName(event.target.classList[0]);
            for(j = 0; j < country.length; j++) {
                country[j].classList.remove("highlightedCountry");
            }
        });
    }
}
