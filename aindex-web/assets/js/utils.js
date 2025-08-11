/**
 * Get item in an array in a circular fashion
 * @param: {Array} arr The array
 * @param: {Integer} i Circular index of an element
 */
export const circularGetItem = (arr, i) => {
    const n = arr.length;
    return arr[(i % n + n) % n]
}


export const asPercent = (value, total, precision=0) => {
    const percent = value / total * 100;
    return Math.round(percent)
}


export const humanizeBool = (value, yes='yes', no='no', unknown='') => {
    if (value === true) {
        return yes;
    } else if (value === false) {
        return no;
    } else {
        return unknown;
    }
}
