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
        let eName = entry.name.toLowerCase();
        goodTypes.forEach((fType) => {
            if (eName.endsWith(fType)) {
                if (eName.replace(fType, "").length > 0)
                    legalType = true;
            }
        });
    }
    return (!legalType) || illegalName;
};


async function createResultsFolder(targetFolderEntry, savedMetaData) {
    const errorLogFolder = await targetFolderEntry.createFolder("errorLog");
    const errorFile = await errorLogFolder.createFile("errorlog.html");

    let html = [];
    html.push('<!DOCTYPE html><html id="html"><head></head><body>');
    for (fileName in savedMetaData) {

        //list a file and and all people, subjects, and errors in the file
        if (savedMetaData[fileName].metaDataErrors.length > 0) {
            html.push("<p>");
            html.push("<a href=file://" + fileName.replaceAll("\"", "/").replaceAll(" ", "%20") + ">" + fileName + "</a> ");

            savedMetaData[fileName].metaDataErrors.forEach((error) => {
                html.push("<div>" + error + "<\div>");

            });
        };
        html.push("</p>");
    };
    html.push("</body> </html>");
    errorFile.write(html.join(" "), { append: true });

    const exifFile = await errorLogFolder.createFile("recommendations.bat");
    exifFile.write("cd C:/Users/Owner/Dropbox/ExifTools\r\n");
    for (fileName in savedMetaData) {
    if (savedMetaData[fileName].exiftool.length > 0)
        exifFile.write(savedMetaData[fileName].exiftool.forEach((exif) => {
            exifFile.write(exif, { append: true });
        }));
    }

};

/**
 * Determine the suffix of the labeledDirectory folder by finding previous versions and adding 1 to the _n suffix of the folder name.
 */
/**
 * 
 * @param {*} ents List of files and folders of the top level folder 
 * @returns The name of the output labeledDirectory top level folder
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

/** Given a string, capitalize the words
 * 
 * @param {*} str String that may contain illegal characters
 * @returns capitalized string
 */
function capitalize(str) {
    let fileName = str.toString();
    fileName = fileName.toString().replaceAll("  ", " "); // remove double spaces
    return fileName.split(" ").map((word) => {
        return word[0].toUpperCase() + word.substring(1);
    }).join(" ");
};

/** Given a string, remove any characters that will cause trouble later when the string is used to create a file name 
 * And standardize capitalization
 * 
 * @param {*} str String that may contain illegal characters
 * @returns sanitized string
 */
function removeIllegalFilenameCharacters(str) {
    let fileName = str.toString();
    while (fileName.includes("  ")) {
        fileName = fileName.replaceAll("  ", " "); // remove double spaces
    }
    ["/", "\\", "\"", ":", "<", ">", "\|", "?", "*"].forEach((x) => { fileName = fileName.replaceAll(x, ""); });
    return capitalize(fileName);
};

module.exports = {
    getFaceTagsTreeName, skipThisEntry, countFiles, createResultsFolder,  removeIllegalFilenameCharacters
};