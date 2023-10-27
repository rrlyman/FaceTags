
// copywrite 2023 Richard R. Lyman
const txt = [
    '<p>In Lightroom Classic in the Library Loupe view, a rectangle will appear around each person\'s face.&nbsp;' +
    'If there is no rectangle, then click and drag to draw one.' +
    '</p> ' +
    '<p>Type a name or other text into the box above the rectangle.&nbsp;' +
    'This is the text that will show up as a label for each person.'+
    '</p> ',

    '<p>The rectangle information must be stored in the photo file. &nbsp;' +
    ' Either, edit a copy in Photoshop with Lightroom adjustments, select "Save Metadata to File or &nbsp;' +
    ' press Ctrl+S (Windows) or Command+S (Mac OS).</p> '+
    '<p>The metadata "RegionList" can be viewed as in Photoshop under File/File Info/ Raw Data</p>'+
    '<meta name="viewport" content="width=device-width, initial-scale=1"> '+
      '<p><img src="MetaData.png" ></p>' +    
    '</p> ',

    '<p>The next step is to go over to PhotoShop 2024 and load the file. &nbsp;' +
        ' There are numerous ways to do this. '+
        '<ul>' +
            '<li>From Lightroom Classic go to Photoshop - Ctrl + E (Windows) or  Command + E (Mac).</li>' +
            '<li>Open PhotoShop, load the photo, and Run Tagging on the Image</li>'+
            '<li>Open PhotoShop and select "Open Files" to Tag one or more files</li>'+
        '</ul>'+
        'ALWAYS edit a copy of the photo, since accidentally selecting Yes, when prompted to overwrite a file,&nbsp;' +
        'will cause the image with the labels to be saved.</li>' +
    '</p> ',

    '<p>After control changes, the face tag program will be automatically rerun.' +
        '<ul>'+
            '<li>"Text Color" selects a color for the text. </li>' +
            '<li>"Border Color" is the color around the text.</li>' +
            '<li>To leave a layer for each person, leave "Merge Layers" unchecked.</li>'+
            '<li>After tagging, a border is drawn around the text if "Background Effects" is checked.</li>' +
            '<li>Portrait shows the original photo on the top half and the Person names on the bottom half.</li>' +            
            '<li>"Vertical Position" moves the text label up or down.</li>'+
            '<li>"Font Size" changes the text character sizes.</li>'+
            '<li>"Refresh" refreshes tagging on the image.  This deletes any existing edits!</li>'+
            '<li>"Files" opens a file picker and one or more files can be loaded and tagged.</li>'+
            '<li>"Folders" opens a folder picker. Select the parent folder containing the images. A new folder tree, "Facetags_n"  containing the tagged images will be created under the parent folder.</li>'+            
        '</ul>'+
    '</p> ',
    '<p>After Tagging the Faces, here are some things to try:' +
        '<ul>' +
            ' <li> Under the Facetags group layer, open the Stroke effects to adjust the type of background. </li>'+
            ' <li> Pick different background effects, trying combinations of size and color.</li>'+            
            ' <li> If "Merge Layers" is unchecked, there will be one layer for each individual,  &nbsp;</li>' +
              'Select one or more of these layers to change color and effects for particular individuals.</li>. '+
            ' <li> Manually merge all the layers into the FaceTags layer via the menu item Layers/Merge Group. &nbsp; '+            
            ' NOTE: Clicking on Refresh will delete all edits by rewinding to the initial history state!</li>' +   
        '</ul>'+    
        '</p>'    ,
        '<p><img src="Mash_Goes_to_a_Wedding.png"></p>'  
];
function helpHtml(i) {
    let x = '<sp-heading>Step &nbsp;' + (i + 1) + '</sp-heading>' +
        '<sp-body Width="600px" Height="500px">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1"> '+
        '<style> '+
            'img { '+
                'display: block; '+ 
                'margin-left: auto; '+ 
                'margin-right: auto;'+
            '}'+
            'btnCancel { }   '+        
            'btnNext { }'+
            'btnPrev { }'+
            'btnTest { }  '+ 
            '.container { '+
                'display: flex; '+
                'justify-content: space-between; '+
            '} '+
            '</style> '+
         '<p><img src="Step' + (i + 1) + '.png"  ></p>' +
        txt[i] +
        '</sp-body><footer class="container">' +
            '<sp-button class="btnPrev">Prev</sp-button>'+           
            '<sp-button class="btnCancel">Cancel</sp-button>'+  
            '<sp-button class="btnTest"> Try It </sp-button> ' +                       
            '<sp-button class="btnNext"> Next </sp-button> ' +  
        '</footer>';
    return x;
};
/**
 * Makes an array of Dialog HTML elements, one for each help page
 * @returns 
 *  */
function makeHelpDialogs() {
    for (let i = 0; i < txt.length; i++) {
        let newDialog = document.createElement('DIALOG');
        newDialog.innerHTML = helpHtml(i);
        document.body.appendChild(newDialog);               
        dialogs.push(newDialog);
    }

    function dialogE(evt) { return evt.target.parentNode.parentNode }
    document.getElementsByClassName("btnCancel").forEach((bNode) => {
        bNode.addEventListener("click", evt => {
        dialogE(evt).close();  
        });
    });

     document.getElementsByClassName("btnNext").forEach((bNode) => {        
        bNode.addEventListener("click", evt => {
        if (dialogE(evt).nextSibling != null){
            dialogE(evt).close();  
            dialogE(evt).nextSibling.uxpShowModal();
        }
        });
    });

    document.getElementsByClassName("btnPrev").forEach((bNode) => {        
        bNode.addEventListener("click", evt => {  
        if (dialogE(evt).previousSibling.nodeName == "DIALOG") {
            dialogE(evt).close();     
            dialogE(evt).previousSibling.uxpShowModal();
        }            
        });
    });
 
    document.getElementsByClassName("btnTest").forEach((bNode) =>  {        
        bNode.addEventListener("click", evt => {
        dialogE(evt).close(); 
        tryIt();
        });
    });

};


/**
 * Loads an example file and runs the Face Tag
 *  */ 
async function tryIt() {
    const fs = require("uxp").storage.localFileSystem;
    const pluginFolder = await fs.getPluginFolder();
    const theTemplate = await pluginFolder.getEntry("1stCommunion1954.jpg");
    const app = require("photoshop").app;
    await app.open(theTemplate);
    await tagSingleFile();
}

module.exports = {
    makeHelpDialogs
}