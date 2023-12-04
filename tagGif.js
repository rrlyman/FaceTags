
// copywrite 2023 Richard R. Lyman

const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { getFaceTagsTreeName, skipThisEntry } = require("./tagFace.js");




/**
 * personsIndex is a one to many dictionary, where the key is the person's name, 
 * Then there is one entry for each year of the person rectangles that were found.
 * e.g {person.name: {year: person}}   ( definition of the person's rectangle such as 1957: personRick, 1958: personBob etc
  */
let personsIndex = {};

/**  
 * subjectIndex is a one to many dictionary, where the key is a subject, such as "reunion" and the many is an array of the names of persons.
 * The entry is an array of persons that had at least one photo in which they appeared that also had the subject, "reunion".
 * e.g {subject: [personRick, personBob]}
 * */
let subjectIndex = {};   // keys = subjects that are not person names, entries = person names   
let iFiles = 0;
let nFiles = 0;

function checkKeywords() {
   for (let key in subjectIndex) {
      for (let n = 0; n < subjectIndex[key].length; n++) {
         if (personsIndex[key] != null) {
            alert(" bad keyword "+ key + " in file " + personIndex[key].entry.name);
            //subjectIndex[key][n] = subjectIndex[key][n] + personsIndex[key].entry.name;
         }
      }


   }


}
/**
 * Opens up a folder dialog box to select top folder to process
 * Makes a new folder called originalPhotosFolder_n and builds a tree under it that duplicates
 * the source tree. Populates it with tagged photos of the originals.
 * 
 * Annotates each file with the face tag labels for each person found in the file metadata 
 * 
 * @param {*} originalPhotosFolder       Folder Entry that is navigating the folder tree with the original photos. null if is the initial call

 * @returns none
 */
async function createIndex() {


   originalPhotosFolder = await fs.getFolder();
   if (originalPhotosFolder != null) {  // null if user cancels dialog              
      disableButtons();  // only enable the Cancel button 
      // gather all the years of the each person
      nFiles = await countFiles(originalPhotosFolder);
      iFiles = 0;

      personsIndex = {};  // keys = person names, entries = rectange definitions and subjects
      subjectIndex = {};   // keys = subjects, entries = person names

      document.getElementById("progressBar").value = "0";
      await recurseIndex(originalPhotosFolder);
      // check for illegal keywords
     // checkKeywords();

      document.getElementById("progressBar").value = "100";

      let menu = document.getElementById("dropMenu");
      while (menu.options.length > 0)
         menu.options[0].remove();
      filterKeyword = "";
      let subjects = Object.keys(subjectIndex).sort();
      
   // purge the subjectIndex of any keywords that are also persons
   for (let iSubject in subjects) {

      if (personsIndex[subjects[iSubject]]!=undefined) 
      {
         delete subjectIndex[subjects[iSubject]];
      }
   }
   subjects = Object.keys(subjectIndex).sort();
      for (let iSubject in subjects) {
         const item = document.createElement("sp-menu-item");
         item.textContent = subjects[iSubject];
         menu.appendChild(item);
      }

      const item = document.createElement("sp-menu-divider");    
      menu.appendChild(item);

   
      let persons = Object.keys(personsIndex).sort();
      for (let iPerson in persons) {
         const item = document.createElement("sp-menu-item");
         item.textContent = persons[iPerson];
         menu.appendChild(item);
      }


      enableButtons();
   }
};

/** If the selected filterKeyword from the drop box is "" then use the personsIndex as the source of the names to GIF
 * If the selected filterKeyword is in the subjectIndex, the use all of the names for filterKeyword in the subjectIndex.
 * If the selected filtereyword is in the personsIndex, GIF only that person
 * 
 * @param {*} newIndex 
 */
function filtered() {
   if (filterKeyword == "")
      return personsIndex;
   let newIndex = {};

 
   if (subjectIndex[filterKeyword] != undefined) {
      subjectIndex[filterKeyword].forEach((pName) => {
         if (personsIndex[pName] != undefined)
            newIndex[pName] = personsIndex[pName];
      });
      return newIndex;
   }

   if (personsIndex[filterKeyword] != undefined)
      newIndex[filterKeyword] = personsIndex[filterKeyword];
   return newIndex;
};

/** Run the Gifmaker. If the folder tree has not been scanned, then create and index
 *  Gif everyone, unless a keyword has been selected in the dropDown menu
 * 
 */
async function gifBatchFiles() {
   // if the index has already been created, then skip index creation
   if (originalPhotosFolder == null) {
      await createIndex();
   }

   let filteredIndex = filtered();
   disableButtons();

   // create gif folder
   const ents = await originalPhotosFolder.getEntries();
   let newName = getFaceTagsTreeName(originalPhotosFolder.name, ents, gifSuffix);
   gifFolder = await originalPhotosFolder.createFolder(newName);

   // go through all the people that were found and make a GIF for each one.

   let iPerson = 0;
   let nPersons = Object.keys(filteredIndex).length;
   document.getElementById("progressBar").value = "0";

   for (var personKey in filteredIndex) {
      document.getElementById("progressBar").value = (100 * iPerson++ / nPersons).toString();

      if (stopTag)
         break;
      const dpi = 72;
      const inflate = 1;
      let targetDoc = null;

      // For each person, there was an entry, one per year.
      // Go through the years and make a frame in the GIF for each year

      let lastYear = 0;
      for (var yearKey in filteredIndex[personKey]) {
         if (stopTag)
            break;
         if (Number(yearKey) < lastYear)  // for debugging
            alert("Years are out of order");
         lastYear = yearKey;

         // make the source image the same size as the gif
         let person = personsIndex[personKey][yearKey];
         let sourceDoc = await executeAsModal(() => app.open(person.entry), { "commandName": "Opening batched File" });

         const left = person.x - inflate * person.w;
         const right = person.x + inflate * person.w;
         const top = person.y - inflate * person.h;
         const bottom = person.y + inflate * person.h;
         let bounds = { left: Math.max(0, left), top: Math.max(0, top), right: Math.min(sourceDoc.width, right), bottom: Math.min(sourceDoc.height, bottom) };

         await executeAsModal(() => sourceDoc.crop(bounds), { "commandName": "Crop File" });
         await executeAsModal(() => sourceDoc.resizeImage(gSettings.gifSize, gSettings.gifSize, dpi), { "commandName": "Resize batched File" });
         if (targetDoc == null) {
            targetDoc = sourceDoc;  // the first clipped sourceDoc is the target 
         } else {
            await executeAsModal(() => sourceDoc.layers[0].duplicate(targetDoc), { "commandName": "Make new layer" });
            await executeAsModal(() => sourceDoc.closeWithoutSaving(), { "commandName": "Closing" });
            sourceDoc = null;
         }
         await new Promise(r => setTimeout(r, 100));    // required to give time to process Cancel Button
      }

      // turn the layers into a gif and save it

      let fname = personKey + '.gif';
      if (targetDoc.layers.length > 1)
         await makeGif();
      let saveEntry = await gifFolder.createFile(fname);
      await executeAsModal(() => targetDoc.saveAs.gif(saveEntry), { "commandName": "Saving" });
      await executeAsModal(() => targetDoc.closeWithoutSaving(), { "commandName": "Closing" });
      targetDoc = null;
   }

   console.log("topRecursionLevel");
   document.getElementById("progressBar").value = "0";
   enableButtons();
};

/**for the progress bar, get an overall file ocount.
 * 
 * @param {*} folder The root file folder
 * @returns the number of file entries under the root
 */
async function countFiles(folder) {
   let ents = await folder.getEntries();
   let iCount = 0;
   for (let i = 0; i < ents.length; i++) {
      if (skipThisEntry(ents[i]))
         continue;
      iCount++;
      if (ents[i].isFolder)
         iCount += await countFiles(ents[i]);
   }
   return iCount;
}

/** Create an index of all the face rectangles in the folder tree
 * 
 * @param {*} originalPhotosFolder 
 * @returns 
 */
async function recurseIndex(originalPhotosFolder) {

   // process all the files and folders in the originalPhotosFolder
   const entries = await originalPhotosFolder.getEntries();
   for (let i = 0; (i < entries.length) && (!stopTag); i++) {
      const entry = entries[i];;
      document.getElementById("progressBar").value = (100 * ++iFiles / nFiles).toString();

      if (skipThisEntry(entry))
         continue;

      // recurse folders

      if (entry.isFolder) {
         await recurseIndex(entry);
      } else {
         ////////////////////     PAYLOAD START     /////////////////////     
         let [persons, subjects] = readPersonsFromMetadata(entry);  // persons in the file, with the subject keywords for each person

         // a subject in subjectIndex has an entry for each person that had at least one instance of that subject

         persons.forEach((person) => {
            subjects.forEach((subject) => {
               if (subjectIndex[subject] == undefined)
                  subjectIndex[subject] = Array(0);
               subjectIndex[subject].push(person.name);
            });

            // create a dictionary of person names each of which
            // has an value of another dictionary with an entry for each year
            // the value of which is the filename, person name, biggest area face rectange for the year, etc

            const year = person.dateTaken.split("-")[0];  // year   
            if (!(person.name in personsIndex))
               personsIndex[person.name] = {};
            if (!(year in personsIndex[person.name]) ||
               !(personsIndex[person.name][year].w * personsIndex[person.name][year].h < person.w * person.h)) {
               personsIndex[person.name][year] = person;  // person with the biggest aread (best resolution?) during the year
            }
         })
      }
      ////////////////////     PAYLOAD END     /////////////////////                  

   }
};




async function makeGif_actn() {
   const result = await batchPlay(
      [
         {
            _obj: "makeFrameAnimation",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
   const result1 = await batchPlay(
      [
         {
            _obj: "animationFramesFromLayers",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
   const result2 = await batchPlay(
      [
         {
            _obj: "animationSelectAll",
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );

   const result3 = await batchPlay(
      [
         {
            _obj: "set",
            _target: [
               {
                  _ref: "animationFrameClass",
                  _enum: "ordinal",
                  _value: "targetEnum"
               }
            ],
            to: {
               _obj: "animationFrameClass",
               animationFrameDelay: gSettings.gifSpeed * (.975 + .05 * Math.random())
            },
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}

async function makeGif() {
   await executeAsModal(() => makeGif_actn(), { "commandName": "Action Commands" });
}

module.exports = {
   gifBatchFiles, recurseIndex, createIndex
};