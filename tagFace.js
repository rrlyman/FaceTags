
// copywrite 2023 Richard R. Lyman
const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { setOutsideStroke, makeAPortrait } = require("./tagBatchPlay.js");
const { getFaceTagsTreeName, skipThisEntry, countFiles, removeIllegalFilenameCharacters, writeErrors } = require("./tagUtils.js");


class Tags {
    init() {
        this.dontAsk = false;               // puts up only one alert for missing metadata when loading a bunch of files
        this.aDoc = app.activeDocument;     // currently active document

        /**savedMetaData is a directory with an entry for each file containing persons, subjects and errors */
        this.savedMetaData = {};


    }
    constructor() {
        this.originalPhotosFolder = null;   // if not null,  then an index has already been built
        this.init();
    }

    /** face tag a file
     * 
     * @param {*} entry a UXP File entry for the disk file to be opened and tagged
     * 
     * @returns false if the file type is not on the list to be facetagged or there are no persons to facetag.
     */
    async openAndTagFileFromDisk(entry) {

        if (skipThisEntry(entry)) // skip over unsupported photo file types
            return false;

        const [persons, subjects, html, cmd, regionNames] = readPersonsFromMetadata(entry);
        this.savedMetaData[entry.nativePath] = [persons, subjects, html, cmd, regionNames];

        if (persons.length == 0)  // do not even try to open the file if there are no persons in it
            return false;

        // open returns a document, but it might no yet be open, in case the ID is undefined
        do {
            const x = await xModal(() => app.open(entry), { "commandName": "Opening batched File" });
            if (!(x == undefined || x == null || x.id == undefined))
                break;
            await new Promise(r => setTimeout(r, 2000));
        } while (true);

        this.aDoc = app.activeDocument;

        if (stopFlag || this.aDoc == null)
            return false;
        await this.faceTagTheImage(persons);
        return persons.length > 0;
    }

    /**
     * Refreshes the FaceTags for the currently open active document
     */
    async tagSingleFile() {
        this.aDoc = app.activeDocument;
        await disableButtons("Refreshing Labels");
        if (app.documents.length != 0) {
            let [persons, subjects, html, cmd, regionNames] = readPersonsFromMetadata(null);
            this.dontAsk = false;

            await this.resetHistoryState(this.aDoc);        // start with clean document  
            await this.faceTagTheImage(persons);
        }
        await enableButtons();
    };

    /**
     * Opens up a file dialog box which returns a list of files to process
     * Annotates each file with the face tag labels for each person found in the file metadata 
     * the photos remain loaded in Photoshop
     */
    async tagMultiFiles() {

        await disableButtons("Tagging Files");
        // Put up a dialog box, and get a list of file(s) to face tag.
        const files = await fs.getFileForOpening({ allowMultiple: true });

        this.dontAsk = false; // puts up only one alert for missing metadata when loading a bunch of files
        progressbar.max = files.length;
        for (let i = 0; i < files.length && (!stopFlag); i++) {
            await progressbar.setVal(i);
            if (! await this.openAndTagFileFromDisk(files[i]))
                continue;
        }
        await enableButtons();
    };

    /**
     * Opens up a folder dialog box to select top folder to process
     * Makes a new folder called originalPhotosFolder-labelled_n and builds a tree under it that duplicates
     * the source tree. Populates it with tagged photos of the originals.
     * 
     * Annotates each file with the face tag labels for each person found in the file metadata 
     * 
      * @returns 
     */
    async tagBatchFiles() {


        this.originalPhotosFolder = await fs.getFolder();
        if (this.originalPhotosFolder == null) {  // null if user cancels dialog              
            return;
        }
        this.init();
        this.dontAsk = true;  // omit no persons found message
        await disableButtons("Processing Folders");  // only enable the Cancel button  

        // create the top level labeledDirectoryFolder
        const ents = await this.originalPhotosFolder.getEntries();
        const newFolderName = getFaceTagsTreeName(this.originalPhotosFolder.name, ents, labeledSuffix);
        const targetFolderEntry = await this.originalPhotosFolder.createFolder(newFolderName);


        await disableButtons("Counting Files");

        progressbar.max = await countFiles(this.originalPhotosFolder);
        if (!stopFlag) {
            await disableButtons("Tagging files");  // only enable the Cancel button 
            await this.recurseBatchFiles(this.originalPhotosFolder, targetFolderEntry);
        }
        const resultsFolder = await targetFolderEntry.createFolder("suggestions");
        await writeErrors(resultsFolder, this.savedMetaData);
        this.savedMetaData = {};  // free up memory
        await enableButtons();
    };

    /**
     * Opens up a folder dialog box to select root folder to process.
     * Makes a new folder called photosFolder-labelled_n and builds a tree under it that duplicates
     * the source tree. Populates it with tagged photos of the originals.
     * 
     * Annotates each file with the face tag labels for each person found in the file metadata 
     * 
     * @param {*} photosFolder       Folder Entry that is navigating the folder tree with the original photos. null if is the initial call
     * @param {*} labeledDirectoryFolder     Folder Entry that is navigating the folder tree containing the results of the faceTagging.
     * @returns 
     */
    async recurseBatchFiles(photosFolder, labeledDirectoryFolder) {

        let newFolder = null;

        // traverse the labeledDirectory folder with an folder names similar to the original folder tree
        newFolder = await labeledDirectoryFolder.createFolder(photosFolder.name + labeledSuffix);

        // process all the files and folders in the photosFolder
        if (newFolder != null) {
            const entries = await photosFolder.getEntries();
            for (let i = 0; (i < entries.length) && (!stopFlag); i++) {

                const entry = entries[i];;

                if (skipThisEntry(entry))
                    continue;

                await progressbar.incVal();

                if (entry.isFolder) {
                    await this.recurseBatchFiles(entry, newFolder);
                } else {

                    ////////////////////     PAYLOAD START     /////////////////////      

                    // Facetag the file                 
                    if (! await this.openAndTagFileFromDisk(entry))
                        continue;

                    // and save it
                    await xModal(() => this.aDoc.flatten(), { "commandName": "Flattening" });   // required to save png 
                    let fname = removeIllegalFilenameCharacters(this.aDoc.name) + labeledSuffix + '.jpg';

                    let saveEntry = await newFolder.createFile(fname); // similar name as original but store on tagged tree.
                    await xModal(() => this.aDoc.saveAs.jpg(saveEntry), { "commandName": "saveAs.jpg" });
                    await xModal(() => this.aDoc.closeWithoutSaving(), { "commandName": "closeWithoutSaving" });


                    ////////////////////     PAYLOAD END     /////////////////////      

                }
            }

            // delete empty folders
            // if permission error, wait and try a few times.
            let ents = await newFolder.getEntries();
            if (ents.length == 0) {
                for (let i = 0; (i < 3) && (!stopFlag); i++) {
                    try {
                        if (await newFolder.delete() == 0) break;
                    } catch (e) {
                        console.log("File delete error  " + e.toString() + "  " + newFolder.nativePath);
                        await new Promise(r => setTimeout(r, 3000));    // give Dropbox enough time to free the folder permissions                         
                    }
                }
            }
        }
    };


    /** Create face labels for each person rectangle found in the document metadata
     *  
     * @param {[{personName, x, y, w, h}]} persons 
     * @returns 
     */
    async faceTagTheImage(persons) {

        if ((persons != undefined) && (persons.length <= 0)) {
            const fname = this.aDoc.path;
            const txt1 = "No face rectangles were found in the metadata of file  \'" + fname + "\'\.   ";
            const txt2 = "Identify Faces in Lightroom Classic and save the metadata of the image file to the disk by pressing Ctrl+S (Windows) or Command+S (Mac OS).  ";
            const txt3 = "It is recommended to facetag a copy of the original file to avoid accidentally saving over the original!  ";
            if (!this.dontAsk) alert(txt1 + txt2 + txt3);
            this.dontAsk = true;
            return;
        }

        persons.sort((a, b) => b.name.toUpperCase().localeCompare(a.name.toUpperCase()));

        if (this.aDoc.layers.length > 1)
            await xModal(() => this.aDoc.flatten(), { "commandName": "Flattening" });

        //  find a common face rectangle size that doesn't intersect the other face rectangles too much, and move the rectangle below the chin

        let bestRect = this.analyzeRectangles(persons, gSettings.vertDisplacement);
        if ((bestRect.w > 0) && (bestRect.h > 0)) {

            // Put all layers under a group layer, "FaceTags"

            let faceTagsGroup = await xModal(() => { return this.aDoc.createLayerGroup({ name: "FaceTags" }) }, { commandName: "AddingLayer" });

            for (let i = 0; (i < persons.length) && (!stopFlag); i++) {

                await new Promise(r => setTimeout(r, 75));    // required to give time process Cancel Button             
                await this.addLayer(persons[i], bestRect);

            }

            // squash all the artlayers into one "FaceTags" layer

            if (gSettings.merge)
                await xModal(() => faceTagsGroup.merge(), { commandName: "AddingLayer" });

            // apply backdrop effects

            if (gSettings.backStroke)
                await setOutsideStroke();

            // convert to portrait format image

            if (gSettings.outputMode == 1)
                await makeAPortrait(this.aDoc);

            await new Promise(r => setTimeout(r, 150));    // required to give time process Cancel Button 
        }
    };

    /**
     * make a new text layer for a person, wraps layer addition to make it run modal
     * @param {*} person {personName, x, y, w, h}
     * @param {*} bestRect {w,h} face rectangle size to be used for placing the text
     * 
     */
    async addLayer(person, bestRect) {
        await xModal(() => this.addLayer_actn(person, bestRect), { "commandName": "Adding a layer for each person." });
    };

    /**
     * Make a new text layer for a person.
     * @param {*} person {personName, x, y, w, h}
     * @param {*} bestRect {w,h} face rectangle to be used for placing the text
     */
    async addLayer_actn(person, bestRect) {

        let bnds = { "_left": person.x - bestRect.w / 2, "_top": person.y, "_bottom": person.y + bestRect.h, "_right": person.x + bestRect.w / 2 };

        let newLayer = await this.aDoc.createTextLayer({
            "name": person.name,
            bounds: bnds,
            fontSize: this.calculatePoints(bestRect),
            width: bestRect.w,
            height: bestRect.h
        });

        newLayer.textItem.contents = this.justifyText(person.name);
        newLayer.textItem.textClickPoint = { "x": person.x, "y": person.y };
        newLayer.textItem.paragraphStyle.justification = constants.Justification.CENTER;
        newLayer.textItem.characterStyle.fauxBold = true;
        newLayer.textItem.characterStyle.color = gSettings.foreColor;

    };
    /**
     * Erase all edits by rewinding to the first history state.
     * @param {*} this.aDoc // the active document 
     */

    async resetHistoryState(doc) {
        try {
            if (doc.historyStates.length > 0) {
                await xModal(() => { doc.activeHistoryState = this.aDoc.historyStates[0] }, { "commandName": "Reset History State" });

            }
        } catch (e) { console.log(e); }
    };


    /** 
    *   Inflate the rectangles alot to give more room for text. 
    *   Deflate the rectangles until there are no intersecting rectangles. 
    *   Inflate them slightly again to make the text bigger. 
     *  Move the rectangle down below the chin. 
     *  Convert the person regions to pixels. 
     * @param {[{personName, x,y,w,h}]} persons 
     * @param {float} gVertDisplacement Amount to move the destination rectangle up or down
     * @returns the target rectangle size for all the persons in the photo
     */
    analyzeRectangles(persons, gVertDisplacement) {
        let avgWidth = 0.0;
        let avgHeight = 0.0;
        for (let i = 0; i < persons.length; i++) {

            persons[i].y = (persons[i].y - gVertDisplacement * persons[i].h);  	// lower the rectangle below the chin by changing x,y to be the center of the top of the bounding box   

            const widenAmt = 4;                                                 // inflate the rectangle, but clip to the width and height
            persons[i].w = Math.min(this.aDoc.width, widenAmt * persons[i].w);	// (x,y) is the center of the rectangle so they do not move during inflation or deflation.    
            persons[i].h = Math.min(this.aDoc.height, widenAmt * persons[i].h);

            avgWidth += (persons[i].w / persons.length);		                            // calculates out an average size for the text boxes
            avgHeight += (persons[i].h / persons.length);
        };

        const rect = {
            "w": avgWidth,
            "h": avgHeight
        };
        const bestRect = this.reduceRectangles(persons, rect);
        return bestRect;

    };
    /**
     * If the face rectangle of a person hits the bottom of the photo, move the person rectangle up.
     * @param {*} persons   person rectangles
     * @param {*} bestRect  the width and height of the rectangle to use for all faces
     * @returns bestRect 
     */
    hitsTheBottom(persons, bestRect) {

        for (let i = 0; i < persons.length; i++) {
            if ((persons[i].y + bestRect.h / 3) > this.aDoc.height) {       // does it almost hit bottom      
                // console.log(persons[i].name + " hits the bottom in " + this.aDoc.name);
                persons[i].y = this.aDoc.height - .2 * bestRect.h;   // move it up
            }
        }
    };

    /**
     * Keep reducing the size of the average rectangle until there are no intersecting rectangles.
     * @param { [{personName, x,y,w,h}]} persons 
     * @param {{width, height}} bestRect 
     * @returns bestRect
     */
    reduceRectangles(persons, bestRect) {
        let rtn;
        for (let k = 0; k < 5; k++) {
            if (this.isIntersect(persons, bestRect)) {
                // deflate   
                bestRect = {
                    "w": bestRect.w * .9,
                    "h": bestRect.h * .9
                }
            };
        };
        this.hitsTheBottom(persons, bestRect);
        return bestRect;
    };

    // 
    /**
     * Check to see if rectangles intersect
     * @param {*} persons 
     * @param {*} bestRect 
     * @returns true if there are two rectangles anywhere on the page that intersect,
     */
    isIntersect(persons, bestRect) {
        for (let i = 0; i < persons.length; i++) {
            for (let j = i + 1; j < persons.length; j++) {
                if (this.intersect(persons[i], persons[j], bestRect)) {
                    // console.log(persons[i].name + " intersects " + persons[j].name);
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
     * @returns true if they intersect
     */
    intersect(person1, person2, bestRect) {

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
     * Calculate the points in pixels
     * @param {*} bestRect {width, height}
     * @returns pixels to be used in font size
     */
    calculatePoints(bestRect) {
        const inchesPerRectangle = bestRect.w / this.aDoc.resolution;
        const points1Char = 72 * inchesPerRectangle; // a single character across the rectangle
        const pointsNcharacters = points1Char / gSettings.charsPerFace;

        let points = gSettings.fontSize * bestRect.w / (gSettings.charsPerFace);  // pixels per character
        if (points < 3.0)
            points = 3.0;
        return points;
    };

    /**
     * break up long names so they do not overlay each other
     * 
     * @param {*} text string containing the text to justify
     * @returns string containing lines of text separated by returns
     */
    justifyText(text) {
        let justified = text.split(" ");                        // separate individual words
        for (let i = 0; i < justified.length - 1; i++) {
            if ((justified[i].length + justified[i + 1].length) < gSettings.charsPerFace) {
                justified.splice(i, 2, justified[i] + " " + justified[i + 1]); // merge words if there are less than the settings charsPerFace
            }
        }
        justified = justified.join("\r");
        return justified;
    };


}

module.exports = {
    Tags
};