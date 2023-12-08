
// copywrite 2023 Richard R. Lyman

const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { getFaceTagsTreeName, skipThisEntry } = require("./tagFace.js");

/**
 * personsDict is a one to many dictionary, where the key is the person's name, 
 * Then there is one entry for each days of the person rectangles that were found.
 * e.g {person.name: {periods: person}}   ( definition of the person's rectangle such as -13: personRick, -12: personBob etc
 * periods is the number of gSettings.days periods since 1970, fpr the year 1957 would be -13
  */
let personsDict = {};


/**  
 * subjectDict is a one to many dictionary, where the key is a subject, such as "reunion" and the many is an array of the names of persons.
 * The entry is an array of persons that had at least one photo in which they appeared that also had the subject, "reunion".
 * e.g {subject: [personRick, personBob]}
 * */
let subjectDict = {};   // keys = subjects that are not person names, entries = person names   
let iFiles = 0;
let nFiles = 0;

function checkKeywords() {
   for (let key in subjectDict) {
      for (let n = 0; n < subjectDict[key].length; n++) {
         if (personsDict[key] != null) {
            alert(" bad keyword " + key + " in file " + personIndex[key].entry.name);
            //subjectDict[key][n] = subjectDict[key][n] + personsDict[key].entry.name;
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

      personsDict = {};  // keys = person names, entries = rectange definitions and subjects
      subjectDict = {};   // keys = subjects, entries = person names

      document.getElementById("progressBar").value = "0";
      await recurseIndex(originalPhotosFolder);

      // check for illegal keywords
      // checkKeywords();

      document.getElementById("progressBar").value = "100";

      // clean out the keyword list on the panel
      let menu = document.getElementById("dropMenu");
      while (menu.options.length > 0)
         menu.options[0].remove();
      filterKeyword = "";
      let subjects = Object.keys(subjectDict).sort();

      // purge the subjectDict of any keywords that are also persons
      // This occurs when there is a person name in a photo that but there is no person rectangle for tem.
      for (let iSubject in subjects) {
         if (personsDict[subjects[iSubject]] != undefined) {
            delete subjectDict[subjects[iSubject]];
         }
      }

      // sort them so the dropdown is nicely sorted
      subjects = Object.keys(subjectDict).sort();
      for (let iSubject in subjects) {
         const item = document.createElement("sp-menu-item");
         item.textContent = subjects[iSubject];
         menu.appendChild(item);
      }

      menu.appendChild(document.createElement("sp-menu-divider"));


      // now add anyone to the dropdown who has a person rectangle

      let personNames = Object.keys(personsDict).sort();
      for (let i = 0; i < personNames.length; i++) {
         const item = document.createElement("sp-menu-item");
         item.textContent = personNames[i];
         menu.appendChild(item);
      }

      enableButtons();
   }
};

/** If the selected filterKeyword from the drop box is "" then use the personsDict as the source of the names to GIF
 * If the selected filterKeyword is in the subjectDict, the use all of the names for filterKeyword in the subjectDict.
 * If the selected filtereyword is in the personsDict, GIF only that person
 * 
 * @param {*} newDict  a filtered version of the personsDict, unsorted!
 */
function filtered() {
   let newDict = {};
   // create a dictionary of person names each of which

   // has an value of another dictionary with an entry for each time period
   // the value of which is the filename, person name, biggest area face rectange for the period, etc

   const msPerPeriod = 1000 * 60 * 60 * 24 * gSettings.days;

   // filters the array of times by only including one time in a given time perion in the newDict
   for (personKey in personsDict) {
      personsDict[personKey].forEach((person) => {

         if (!(person.name in newDict))
            newDict[person.name] = {};

         if (msPerPeriod == 0) {
            newDict[person.name][Math.round(person.dateTaken.getTime())] = person;  // if days == 0, include all gifs for that person
         } else {
            const period = Math.round(person.dateTaken.getTime() / msPerPeriod);
            if (!(period in newDict[person.name]) ||
               !(newDict[person.name][period].w * newDict[person.name][period].h < person.w * person.h)) {
               newDict[person.name][period] = person;
            }
         }
      })
   };


   if (filterKeyword == "")
      return newDict;  // unsorted ??

   let newDict2 = {}

   // sticks anyone in the new dictionary that had the picked subject
   if (subjectDict[filterKeyword] != undefined) {
      subjectDict[filterKeyword].forEach((pName) => {
         if (newDict[pName] != undefined)
            newDict2[pName] = newDict[pName];
      });
      return newDict2;
   }
   // sticks anyone in the new dictionary that matches the picked name
   if (personsDict[filterKeyword] != undefined)
      newDict2[filterKeyword] = newDict[filterKeyword];
   return newDict2;
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
   /**
    * a filtered version of the personsDict
    */
   let filteredDict = filtered();
   disableButtons();

   // create gif folder
   const ents = await originalPhotosFolder.getEntries();
   let newName = getFaceTagsTreeName(originalPhotosFolder.name, ents, gifSuffix);
   gifFolder = await originalPhotosFolder.createFolder(newName);

   // go through all the people that were found and make a GIF for each one.

   let iPerson = 0;
   let nPersons = Object.keys(filteredDict).length;
   document.getElementById("progressBar").value = "0";

   for (var personKey in filteredDict) {
      document.getElementById("progressBar").value = (100 * iPerson++ / nPersons).toString();

      if (stopTag)
         break;
      const dpi = 72;
    
      
      let targetDoc = null;

      // For each person, there was an entry, one per period.
      // Go through the periods and make a frame in the GIF for each year

      // dictionaries can be unordered so make an ordered array

      let msKeys = Object.keys(filteredDict[personKey]).sort(function (a, b) { return a - b; }
      );

      for (let i = 0; i < msKeys.length && !stopTag; i++) {

         // make the source image the same size as the gif
         let person = filteredDict[personKey][msKeys[i]];
         let sourceDoc = await executeAsModal(() => app.open(person.entry), { "commandName": "Opening batched File" });

         let distanceToEdge = Math.min(person.x, sourceDoc.width - person.x, person.y, sourceDoc.height - person.y);
         if (!gSettings.fullPhoto){
            distanceToEdge = Math.min(distanceToEdge, person.w, person.x - person.w, person.h, person.y - person.h);
         }

         const left = person.x - distanceToEdge;
         const right = person.x + distanceToEdge;
         const top = person.y - distanceToEdge;
         const bottom = person.y + distanceToEdge;
       //  let bounds = { left: Math.max(0, left), top: Math.max(0, top), right: Math.min(sourceDoc.width, right), bottom: Math.min(sourceDoc.height, bottom) };
         let bounds = {left: left, right: right, top: top, bottom: bottom};
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

      if (entry.isFolder) {
         await recurseIndex(entry);
      } else {
         ////////////////////     PAYLOAD START     /////////////////////     
         let [persons, subjects] = readPersonsFromMetadata(entry);  // persons in the file, with the subject keywords for each person


         // a subject in subjectDict has an entry for each person that had at least one instance of that subject

         persons.forEach((person) => {
            subjects.forEach((subject) => {
               if (subjectDict[subject] == undefined)
                  subjectDict[subject] = Array(0);
               subjectDict[subject].push(person.name);
            });
            if (personsDict[person.name] == undefined) {
               personsDict[person.name] = Array(0);
            }
            personsDict[person.name].push(person);

         }
         )
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