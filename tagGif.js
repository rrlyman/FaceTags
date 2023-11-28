
// copywrite 2023 Richard R. Lyman

const { readPersonsFromMetadata } = require("./tagMetadata.js");
const { getFaceTagsTreeName, skipThisEntry } = require("./tagFace.js");

const { executeAsModal } = require("photoshop").core;
const { batchPlay } = require("photoshop").action;
// Get the object of a File instance
const fs = require('uxp').storage.localFileSystem;
const { app, constants } = require("photoshop");
const imaging = require("photoshop").imaging;


let personsIndex = {};  // index of all the best thumbnails, one per year per person
let iFiles = 0;
let nFiles = 0;
/**
 * Opens up a folder dialog box to select top folder to process
 * Makes a new folder called originalPhotosFolder_n and builds a tree under it that duplicates
 * the source tree. Populates it with tagged photos of the originals.
 * 
 * Annotates each file with the face tag labels for each person found in the file metadata 
 * 
 * @param {*} originalPhotosFolder       Folder Entry that is navigating the folder tree with the original photos. null if is the initial call

 * @returns 
 */
async function gifBatchFiles(originalPhotosFolder,) {
   if (originalPhotosFolder == null) {  // null is the initial call
      originalPhotosFolder = await fs.getFolder();
      if (originalPhotosFolder == null) {  // null if user cancels dialog              
         return;
      }
      personsIndex = {};
      disableButtons();  // only enable the Cancel button     
   }

   // gather all the years of the each person
   nFiles = await countFiles(originalPhotosFolder);
   iFiles = 0;
   document.getElementById("progressBar").value = "0";
   await createIndex(originalPhotosFolder, iFiles, nFiles);


   // create gif folder
   const ents = await originalPhotosFolder.getEntries();
   let newName = getFaceTagsTreeName(originalPhotosFolder.name, ents, gifSuffix);
   gifFolder = await originalPhotosFolder.createFolder(newName);

   // go through all the people that were found and make a GIF for each one.

   let iPerson = 0;
   let nPersons = Object.keys(personsIndex).length;
   document.getElementById("progressBar").value = "0";

   for (var personKey in personsIndex) {
      document.getElementById("progressBar").value = (100 * iPerson++ / nPersons).toString();

      if (stopTag)
         break;
      const dpi = 72;
      const inflate = 1;
      let targetDoc = null;

      // For each person, there was an entry, one per year.
      // Go through the years and make a frame in the GIF for each year

      let lastYear = 0;
      for (var yearKey in personsIndex[personKey]) {
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

   // get rid of anything that is sitting around. This happens if CANCEL button was pressed.
 if (sourceDoc !=null)
      await executeAsModal(() => sourceDoc.closeWithoutSaving(), { "commandName": "Closing Files" })
      if (targetDoc !=null)
      await executeAsModal(() => targetDoc.closeWithoutSaving(), { "commandName": "Closing Files" })   

   console.log("topRecursionLevel");
   document.getElementById("progressBar").value = "0";
   enableButtons();
};

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
async function createIndex(originalPhotosFolder) {

   // process all the files and folders in the originalPhotosFolder
   const entries = await originalPhotosFolder.getEntries();
   for (let i = 0; (i < entries.length) && (!stopTag); i++) {
      const entry = entries[i];;
      document.getElementById("progressBar").value = (100 * iFiles++ / nFiles).toString();

      if (skipThisEntry(entry))
         continue;

      // recurse folders

      if (entry.isFolder) {
         await createIndex(entry);
      } else {
         ////////////////////     PAYLOAD START     /////////////////////     
         let persons = readPersonsFromMetadata(entry);

         // create a dictionary of person names each of which
         // has an value of another dictionary with an entry for each year
         // the value of which is the filename, person name, biggest area face rectange for the year, etc

         for (let i = 0; i < persons.length && (!stopTag); i++) {
            let person = persons[i];
            const year = person.dateTaken.split("-")[0];  // year   
            if (!(person.name in personsIndex))
               personsIndex[person.name] = {};
            if (!(year in personsIndex[person.name]) ||
               !(personsIndex[person.name][year].w * personsIndex[person.name][year].h < person.w * person.h)) {
               personsIndex[person.name][year] = person;  // person with the biggest aread (best resolution?) during the year
            }
         }
         ////////////////////     PAYLOAD END     /////////////////////                  
      }
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
   gifBatchFiles
};