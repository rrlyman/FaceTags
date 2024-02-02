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
function errorLog(htmlArray, exiftoolArray, txt, exiftoolText) {

    if (txt.length > 0) {
        htmlArray.push("\r\n" + txt);
        if (exiftoolText.length > 0)
            exiftoolArray.push("echo " + txt);
    }

    if (exiftoolText.length > 0) {
        htmlArray.push("Recommend: " + exiftoolText);
        exiftoolArray.push("echo " + exiftoolText);
        exiftoolArray.push(exiftoolText);
    }
}

const tabs = "&nbsp;&nbsp;&nbsp;&nbsp;"

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

    html.push("</head > <body>");

    const warning = [
        "MAJOR ALERT: The \"Recommendations.bat\" file may make changes to the metadata in your photos.",
        "\"Recommendations.bat\" uses \"exiftool\" that must be installed somewhere in the path in your system.",
        "The program, \"exiftool\", will leave the original files untouched with an added extension \"_original\" so you can alway get back the originals.",
        "However, the \"exiftool\" commands should only be tried on a temporary copy of your photo tree, until you are 100% satisfied with the results",
        "before trying them on your original photos.",
        " "
    ];

    html.push("<div>" + warning.join("</div><div>") + "</div>");

    for (fileName in savedMetaData) {

        //list a file and and all people, subjects, and errors in the file
        if (savedMetaData[fileName].metaDataErrors.length > 0) {
            html.push("<p>");
            let fname = fileName.replaceAll("\"", "/").replaceAll(" ", "%20");
            html.push("<a href=\"file://" + fname + "\" >" + fileName + "</a> ");

            savedMetaData[fileName].metaDataErrors.forEach((error) => {
                html.push("<div> " + tabs + htmlEntities(error) + "</div>");

            });
        };
        html.push("</p>");
    };
    html.push("</body> </html>");
    
    const errorFile = await errorFolder.createFile("Errors.html");
    await errorFile.write(html.join(" "), { append: true });

    const exifFile = await errorFolder.createFile("recommendations_run_once.bat");
    await exifFile.write("echo  " + warning.join(" ") + "\r\n", { append: false });

    for (fileName in savedMetaData) {
        await savedMetaData[fileName].exiftool.forEach((exif) => {
            exifFile.write(exif.replaceAll("<", "^<") + "\r\n", { append: true });
        });
    }
    await exifFile.write("del facetags.config\r\n", { append: true });
    await exifFile.write("del recommendations_run_once.bat\r\n", { append: true });    
};

async function writePersons(resultsFolder, personsDict) {
    const personsFolder = await resultsFolder.createFolder("People Results");
    let sortedDict = Object.keys(personsDict).sort();

    let html = [];
    html.push('<!DOCTYPE html><html id="html"><head>');

    html.push("</head > <body>");
    for (x in sortedDict) {
        // console.log(sortedDict[x]);

        let persons = personsDict[sortedDict[x]];

        if (persons != undefined) {

            let html2 = [];
            html2.push('<!DOCTYPE html><html id="html"><head>');
            html2.push("</head > <body>");

            persons.forEach((person) => {
                let fname = person.entry.nativePath.replaceAll("\"", "/").replaceAll(" ", "%20");
                html2.push("<div> " + tabs + "<a href=\"file://" + fname + "\" >" + person.entry.name + " \r\n</a></div> ");
            });

            html2.push("</body> </html>");
            const html2File = await personsFolder.createFile(sortedDict[x] + ".html");
            await html2File.write(html2.join(" "), { append: true });

            let fname = html2File.nativePath.replaceAll("\"", "/").replaceAll(" ", "%20");
            html.push("<div> " + tabs + "<a href=\"file://" + fname + "\" >" + sortedDict[x] + "</a></div> ");

        }
    };

    html.push("</body> </html>");
    const htmlFile = await resultsFolder.createFile("People.html");
    await htmlFile.write(html.join(" "), { append: true });

};


async function writeGlobalSubjects(resultsFolder, globalSubjects, globalFiles) {

    const subjectsFolder = await resultsFolder.createFolder("Keyword Results");
    let sortedDict = Object.keys(globalSubjects).sort();

    let html = [];
    html.push('<!DOCTYPE html><html id="html"><head>');

    html.push("</head > <body>");
    for (x in sortedDict) {
        // console.log(sortedDict[x]);
        let subjects = globalSubjects[sortedDict[x]];

        if (subjects != undefined) {

            let html2 = [];
            html2.push('<!DOCTYPE html><html id="html"><head>');
            html2.push("</head > <body>");

            subjects.forEach((person) => {
                // console.log(person);
                if (person != undefined) {
                    // let fname = person.entry.nativePath.replaceAll("\"", "/").replaceAll(" ", "%20");
                    html2.push("<div>" + person + " </div> ");
                }
            });

            html2.push("</body> </html>");
            const html2File = await subjectsFolder.createFile(sortedDict[x] + ".html");
            html2File.write(html2.join(" "), { append: true });

            let fname = html2File.nativePath.replaceAll("\"", "/").replaceAll(" ", "%20");
            html.push("<div> " + tabs + "<a href=\"file://" + fname + "\" >" + sortedDict[x] + "</a> </div>");

        }
    };

    html.push("</body> </html>");
    const htmlFile = await resultsFolder.createFile("Keywords.html");
    await htmlFile.write(html.join(" "), { append: true });

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

module.exports = {
    getFaceTagsTreeName, skipThisEntry, countFiles, writeErrors, writePersons, writeGlobalSubjects, removeIllegalFilenameCharacters, errorLog, capitalize
};