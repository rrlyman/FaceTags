
// copywrite 2023 Richard R. Lyman



/**
 * break up long names so they do not overlay each other
 * 
 * @param {*} gSettings dictionary containing global settings
 * @param {*} text string containing the text to justify
 * @returns string containing lines of text separated by returns
 */
function justifyText(gSettings, text) {
    let justified = text.split(" ");                        // separate individual words
    for (let i = 0; i < justified.length - 1; i++) {
        if ((justified[i].length + justified[i + 1].length) < gSettings.charsPerFace) {
            justified.splice(i, 2, justified[i] + " " + justified[i + 1]); // merge words if there are less than the settings charsPerFace
        }
    }
    justified = justified.join("\r");
    return justified;
};

/**
 * make a new text layer for a person, wraps layer addition to make it run modal
 * @param {*} gSettings dictionary containing global settings
 * @param {*} person {personName, x, y, w, h}
 * @param {*} bestRect {w,h} face rectangle to be used for placing the text
 * 
 */
async function addLayer(gSettings, person, bestRect) {
    const { executeAsModal } = require("photoshop").core;
    await executeAsModal(() => addLayer_actn(gSettings, person, bestRect), { "commandName": "Adding a layer for each person." });
};

/**
 * make a new text layer for a person
 * @param {*} gSettings dictionary containing global settings
 * @param {*} person {personName, x, y, w, h}
 * @param {*} bestRect {w,h} face rectangle to be used for placing the text
 */
async function addLayer_actn(gSettings, person, bestRect) {
    const app = require('photoshop').app;
    const gDoc = app.activeDocument;
    const constants = require("photoshop").constants;
    const bnds = { "_left": person.x - bestRect.w / 2, "_top": person.y, "_bottom": person.y + bestRect.h, "_right": person.x + bestRect.w / 2 };
    const newLayer = await gDoc.createTextLayer({ "name": person.name, bounds: bnds });
    newLayer.textItem.characterStyle.size = calculatePoints(gSettings, bestRect); // zeros the bounds       
    newLayer.bounds = bnds;
    newLayer.textItem.contents = justifyText(gSettings, person.name);
    newLayer.textItem.textClickPoint = { "x": person.x, "y": person.y };
    newLayer.textItem.paragraphStyle.justification = constants.Justification.CENTER;
    newLayer.textItem.characterStyle.fauxBold = true;
    newLayer.textItem.characterStyle.color = gSettings.foreColor;
};


/**
 * a debugging aid to list a dictionary contents. 
 * @param {*} str string to be prepended to the output
 * @param {*} pEntry  dictionary containing items to be added to str
 * @returns string containing str and pEntry items
 */

function displayDictionary(str, pEntry) {
    str += "{ ";
    // Best for accessing both keys and their values
    for (const [key, value] of Object.entries(pEntry)) {
        if (typeof (value) == 'object')
            str += displayDictionary(key, value) + ", ";
        else if (typeof (value) == "number")
            str += key + ": " + value.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ', ';
        else
            str += key + ": " + value.toString() + ", ";
    }
    str += "}";
    //console.log(str);
    return str;
};


/** 

*   inflates the rectangles alot to give more room for text

*   deflates the rectangles until there are no intersecting rectangles.

*   inflates them slightly again to make the text bigger.

 *  moves the rectangle down below the chin

 *  converts the person regions to pixels.

 *  returns an average rectangle size
 * 
 * @param {[{personName, x,y,w,h}]} persons 
 * @param {float} gVertDisplacement Amount to move the destination rectangle up or down
 * @returns the target rectangle size for all the persons in the photo
 */
function analyzeRectangles(persons, gVertDisplacement) {
    const app = require('photoshop').app;
    const gDoc = app.activeDocument;
    let avgWidth = 0.0;
    let avgHeight = 0.0;
    for (let i = 0; i < persons.length; i++) {
        const personName = persons[i].name;
        let x = persons[i].x;
        let y = persons[i].y;
        let w = persons[i].w;
        let h = persons[i].h;
        const widenAmt = 4;								// inflate the rectangle by a lot.  The bestRect will be delated later.
        x = x * gDoc.width; 							// (x,y) is the center of the rectangle so they do not move during inflation or deflation.       
        y = (y + gVertDisplacement * h) * gDoc.height; 	// lower the rectangle below the chin by changing x,y to be the center of the top of the bounding box       
        w = widenAmt * w * gDoc.width;		        	// inflate the text rectangle 
        h = widenAmt * h * gDoc.height;
        avgWidth += (w / persons.length);		        // calculates out an average size for the text boxes
        avgHeight += (h / persons.length);
        let person = {
            "name": personName,
            "x": x,
            "y": y,
            "w": w,
            "h": h
        };
        persons[i] = person;
    };
    const rect = {
        "w": avgWidth,
        "h": avgHeight
    };
    const bestRect = reduceRectangles(persons, rect);
    //console.log(displayDictionary("average Rectangle = ", rect) + displayDictionary("\tbest Rectangle = ", bestRect));

    return bestRect;

};


/**
 * keep reducing the size of the average rectangle until there are no intersecting rectangles.
 * @param { [{personName, x,y,w,h}]} persons 
 * @param {{width, height}} bestRect 
 * @returns bestRect
 */
function reduceRectangles(persons, bestRect) {
    const app = require('photoshop').app;
    const gDoc = app.activeDocument;
    let rtn;
    for (let k = 0; k < 5; k++) {
        if (!isIntersect(persons, bestRect))
            break;
        // deflate   
        bestRect = {
            "w": bestRect.w * .9,
            "h": bestRect.h * .9
        };
    };

    // if a single head shot, the rectangle hits the bottom of the screen, so move it up.

    if ((persons[0].y + bestRect.h / 2) > gDoc.height) {
        console.log(persons[0].name + " hits the bottom " );
        persons[0].y = gDoc.height - .1 * bestRect.h ;
        bestRect = {
            "w": bestRect.w * .4,
            "h": bestRect.h * .4
        };
    } else {
        bestRect = {    // allow about 20% overlap    
            "w": bestRect.w * 1.2,
            "h": bestRect.h * 1.2
        };
    }
    return bestRect;
};

// 
/**
 * check to see if rectangles intersect
 * @param {*} persons 
 * @param {*} bestRect 
 * @returns true if there are two rectangles anywhere on the page that intersect,
 */
function isIntersect(persons, bestRect) {

    for (let i = 0; i < persons.length; i++) {

        for (let j = i + 1; j < persons.length; j++) {
            if (intersect(persons[i], persons[j], bestRect)) {
                console.log(persons[i].name + " intersects " + persons[j].name);
                return true;
            }
        }
    }
    return false;
};

/**
 * Given two rectangles, return true if they intersect
 * @param {*} person1 
 * @param {*} person2 
 * @param {*} bestRect 
 * @returns true if they intersec
 */
function intersect(person1, person2, bestRect) {

    let minAx = person1.x - bestRect.w / 2;
    let minBx = person2.x - bestRect.w / 2;
    let maxAx = person1.x + bestRect.w / 2;
    let maxBx = person2.x + bestRect.w / 2;
    let minAy = person1.y;
    let minBy = person2.y;
    let maxAy = person1.y + bestRect.h;
    let maxBy = person2.y + bestRect.h;

    const ret = (maxAx >= minBx) && (minAx <= maxBx) && (minAy <= maxBy) && (maxAy >= minBy);
    return ret;
};

/**
 * calculate the points in pixels
 * @param {*} gSettings global settings
 * @param {*} bestRect {width, height}
 * @returns pixels to be used in font size
 */
function calculatePoints(gSettings, bestRect) {
    const points = gSettings.fontSize * bestRect.w / gSettings.charsPerFace;  // pixels per character
    if (points < 3.0)
        points = 3.0;
    return points;
};

module.exports = {
    analyzeRectangles, addLayer, displayDictionary
};