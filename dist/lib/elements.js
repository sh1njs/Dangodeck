"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELEMENT_COLORS = void 0;
exports.elementColor = elementColor;
exports.ELEMENT_COLORS = {
    Neutral: '#b8b8b8',
    Light: '#ffe08a',
    Ground: '#caa472',
    Dark: '#7c6f9c',
    Electric: '#7fd3f0',
    Grass: '#9ddc8a',
    Fire: '#ff9b7a',
    Water: '#8ab6ff',
    Null: '#d6d6d6',
};
function elementColor(el) {
    return exports.ELEMENT_COLORS[el] ?? '#cccccc';
}
//# sourceMappingURL=elements.js.map