// copywrite 2023 Richard R. Lyman

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
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

/** Add text and and exiftool command to the html and cmd arrays
 * 
 * @param {Array} htmlArray The array of text lines to be placed in the .html file
 * @param {Array} exiftoolArray The array of text lines to be placed in the exiftool file
 * @param {string} txt The text to be concatenated to the html array.
 * @param {string} exiftoolText The tex to be cancatenated tot he exiftool array.
 */
function errorLog(html, cmd, txt, exiftoolText) {

    html.push({ "txt": txt, "exif": exiftoolText });
    if (txt.length > 0)
        cmd.push("echo " + txt);
    if (exiftoolText.length > 0)
        cmd.push("echo " + exiftoolText);
    cmd.push(exiftoolText);

}

const tabs = "&nbsp;&nbsp;&nbsp;&nbsp;"
/** make a dictionary of unique Warnings containing an array of files and exif commands for that warning 
 * 
 * @param {*} savedMetaData 
 * @returns a dictionary indexed by the warning text containing an array of files and exif commands for that warning 
 */
function queryWarning(savedMetaData) {
    let warningDB = {};
    for (let nativePath in savedMetaData) {
        savedMetaData[nativePath].html.forEach((x) => {
            console.log(x.txt);
            console.log(" " + x.exif);
            if (warningDB[x.txt] == undefined) warningDB[x.txt] = [];
            warningDB[x.txt].push({ "nativePath": nativePath, "exif": x.exif });
        });
    }

    return warningDB;
};
/** Create an errors.html and recommended.bat files
 * 
 * @param {entry} errorFolder Folder entry to place the files into
 * @param {{}} savedMetaData Persons, errors and such read from the metadata of each file.
 */
async function writeErrors(errorFolder, savedMetaData) {
    // const errorFolder = await resultsFolder.createFolder("Error Results");


    const pluginFolder = await fs.getPluginFolder();
    const configFile = await pluginFolder.getEntry("facetags.config");
    const text = await configFile.read();
    const newConfigFile = await errorFolder.createEntry("facetags.config");
    await newConfigFile.write(text), { append: false };

    let html = [];
    html.push('<!DOCTYPE html><html id="html"><head>');
    html.push("<title>Metatdata Warnings</title>");

    html.push("</head > <body>");

    const warning = [
        "MAJOR ALERT: The \"Recommendations.bat\" file will make changes to the metadata in your photos.  " +
        "Recommendations.bat\" uses \"exiftool\" that must be installed somewhere in the path in your system.  " +
        "For instance, " +
        "<ol>" +
        " <li>download exiftool(-k)</li>" +
        "<li>rename it as exiftool.exe</li>" +
        "<li>stick it in your Windows folder.</li>" +
        "</ol>",
        "The program, \"exiftool\", will leave the original files untouched with an added extension \"_original\" so you can always get back the originals.",
        "However, the \"exiftool\" commands should only be tried on a temporary copy of your photo tree, until you are 100% satisfied with the results " +
        "before trying them on your original photos.  ",
        "The recommendations fix up the following:" +
        "<ul>" +
        "<li>Convert from the Microsoft face recognition metadata format to the Metadata Working Group standard used by Adobe.</li>" +
        "<li>Fix people keywords that have in advertantly been left on photos without that person in the photo.</li>" +
        "<li>Fix non person keywords, such as \"cars\" that has been mistakenly placed in a face recognition rectangle.</li>" +
        "<li>Fix photos, where there is a face recognized, i.e. it has a face detection rectangle and a name entered for that person, but the keyword is missing from the \"keywording\" list</li>" +
        "<li>Make a list of the non person keywords, shown in this file, so you can check it for accuracy. If there are no recommendations shown at the bottom of this file, " +
        "then there were no global keywords detected and all keywords and face data are in agreement. </li>" +
        "</ul>" +
        "This plugin and Lightroom Classic communicate through the metadata in the files on the hard drive.  Lightroom Classic has a database that must be transferred to the metadata " +
        "on the hard drive.  The metadata is then read by this Potoshop plugin to create the \"recommendations.bat\" file. " +
        "The metatdata is updated by the exiftool commands in \"recommendations.bat\" and then is reread back into Lightroom Classic.",
        "<ol>" +
        "<li>Make sure that metadata on the hard drive corresponds to the Lightroom Classic database.  Sync on Lightroom Classic does not work for face detection rectangles. " +
        "Save Metadata to files does not work on face detection rectangles. \"Export as catalog\" does not work on face detection rectangles. Exporting a single file does work. " +
        "The easiest workaround is in Lightroom Classic:</li>" +
        "<ol type=\"A\">" +
        "<li>Click on the top of the photo tree on local hard drive on the left side of the Lightroom Classic screen. </li>" +
        "<li>In the library grid view select all the photos." +
        "<li>Very carefully, working only on a backup copy of your photos, add a keyword such as \"x\" at the bottom of the keywords in \"Keywording\" in the top right of the screen. " +
        " If the setting to automatically update xmp metadata has been enabled, Lightroom Classic will update all the metadata on the hard drive.</li> " +
        "<li>In the keyword list, select \"x\" and choose \"delete\". Lightroom Classic will again write all metadata to the hard drive.</li> " +
        "</ol> " +
        "<li>Run the Recommendations.bat.  To get a record of the results, in a terminal window type \"./recommendations.bat > results.log\"." +
        "<li>Get the metadata back into Lightroom Classic.  Since Sync does not work, select all the photos and from the menu, \"Read Metadata from files\" </li>" +
        "</ol>"];

    html.push("<h1> Metadata Warnings </h1>");
    html.push("<p>" + warning.join("</p><p>") + "</p>");

    // create a database indexed by the warning message.

    let warningDB = queryWarning(savedMetaData);
    for (let warning in warningDB) {
      
        html.push("<div> " + htmlEntities(warning) + "</div>");
        html.push('<p style="margin-left: 25px;">');

        warningDB[warning].forEach((x) => {
            let fileName = x.nativePath;
            let fname = fileName.replaceAll("\"", "/").replaceAll(" ", "%20");
            html.push("<a href=\"file://" + fname + "\" >" + fileName + "</a><br> ");
            if (x.exif.length > 0)
                html.push("Recommend: " + htmlEntities(x.exif)+"<br>");

        });
        html.push("</p>");
    }

    html.push("</body> </html>");

    const errorFile = await errorFolder.createFile("Readme1st.html");
    await errorFile.write(html.join(" "), { append: true });

    let pc = ["echo  " + warning.join(" ")];

    for (let fileName in savedMetaData)
        savedMetaData[fileName].cmd.forEach((x) => { pc.push(x.replaceAll("<", "^<")) });

    const exifFile = await errorFolder.createFile("recommendations.bat");
    await exifFile.write(pc.join("\r\n"), { append: false });

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
};

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
};

function isAlpha(str) {
    return ((("a" <= str) && ("z" >= str)) || ((str <= "Z") && (str >= "A")))
}

/** Given a string, capitalize the words
 * 
 * @param {*} str String that may contain illegal characters
 * @returns capitalized string
 */
function capitalize(str) {

    if (str == undefined || str == null)
        return str;
    if (str.includes("florence")) {
        let k = 5;
    }
    let newStr = "";
    let notAlpha = true;
    for (let i = 0; i < str.length; i++) {
        if (isAlpha(str[i])) {
            if (notAlpha) {
                notAlpha = false;
                newStr += str[i].toUpperCase();;
            } else {
                newStr += str[i].toLowerCase();
            }
        } else {
            newStr += str[i];
            notAlpha = true;
        }
    }
    return newStr;

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

function deleteUndefines(array) {
    let newArray = [];
    array.forEach((a) => {
        let ok = true;
        Object.keys(a).forEach((key) => {
            if (a[key] == undefined) {
                ok = false;
            }
        });
        if (ok) newArray.push(a);
    });
    return newArray;
};

function addSetFunctions(set) {

    Set.prototype.union = function (set2) {
        let newSet = this;
        set2.forEach((x) => { newSet.add(x) });
        return newSet
    }

    Set.prototype.intersection = function (set2) {
        let newSet = new Set();
        this.forEach((x) => {
            if (set2.has(x)) {
                console.log("intersect " + x)
                newSet.add(x);
            }
        });
        return newSet;
    };
    Set.prototype.difference = function (set2) {
        let newSet = new Set();
        this.forEach((x) => {
            if (!set2.has(x))
                newSet.add(x);
        });
        return newSet;
    };
}


module.exports = {
    getFaceTagsTreeName, skipThisEntry, countFiles, writeErrors, removeIllegalFilenameCharacters, errorLog, capitalize, deleteUndefines, addSetFunctions
};