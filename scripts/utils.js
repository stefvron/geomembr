export function getAreaFromPath(path) {
    paper.setup();
    paper.project.clear();
    let item = paper.project.importSVG(path);
    if(item.area) return item.area;
    return -1;
}
