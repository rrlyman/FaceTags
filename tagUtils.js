// copywrite 2023 Richard R. Lyman

/**
 * If an entry contains tagged or giffed information, then skip it
 * @param {*} entry 
 * @returns true if the entry should be skipped.
 */
function skipThisEntry(entry) {

    let illegalName =
        entry.name.includes(gifSuffix + "_") ||
        entry.name.endsWith(gifSuffix) ||
        entry.name.includes(labeledSuffix + "_") ||
        entry.name.endsWith(labeledSuffix) ||
        entry.name.startsWith(".");
    let legalType = true;
    if (!entry.isFolder) {
        legalType = false;
        let goodTypes = ['.bmp', /*'gif', */'.jpg', '.jpeg', '.png', '.psb', '.psd', '.tif', '.tiff'];
        goodTypes.forEach((fType) => {
            let eName = entry.name.toLowerCase();
            if (eName.endsWith(fType)) {
                if (eName.replace(fType, "").length > 0)
                    legalType = true;
            }
        });
    }
    return (!legalType) || illegalName;
};

/**
 * Determine the suffix of the labeledDirectory folder by finding previous versions and adding 1 to the _n suffix of the folder name.
 */
/**
 * 
 * @param {*} ents List of files and folders of the top level folder 
 * @returns The name of the labeledDirectory top level folder
 */
function getFaceTagsTreeName(originalName, ents, suffix) {
    let iMax = 0;
    let targetFolder = originalName + suffix;
    for (let i1 = 0; i1 < ents.length; i1++) {
        if (ents[i1].name.toLowerCase().startsWith(targetFolder.toLowerCase())) {
            let results = ents[i1].name.split("_");
            if (results.length > 1) {
                let x = Number(results.pop())
                if (x > iMax) iMax = x;
            }
        }
    }
    iMax++;
    return targetFolder + "_" + iMax.toString();
}

/**for the progress bar, get an overall file ocount.
 * 
 * @param {*} folder The root file folder
 * @returns the number of file entries under the root
 */
async function countFiles(folder) {
    await disableButtons("Counting Files");
    let ents = await folder.getEntries();
    let iCount = 0;
    for (let i = 0; i < ents.length && !stopFlag; i++) {
        if (skipThisEntry(ents[i]))
            continue;
        iCount++;
        if (ents[i].isFolder)
            iCount += await countFiles(ents[i]);
    }
    return iCount;
}



module.exports = {
    getFaceTagsTreeName, skipThisEntry, countFiles
};