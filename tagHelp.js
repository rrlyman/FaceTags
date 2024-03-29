
// copywrite 2023 Richard R. Lyman
/** The content of a dialog box, each array item if the html for the dialog page */
const txt = [

    // Step 1
    '<p>In Lightroom Classic in the Library Loupe view, a rectangle will appear around each person\'s face.&nbsp;' +
    'If there is no rectangle, then click and drag to draw one.' +
    '</p> ' +
    '<p>Type a name or other text into the box above the rectangle.&nbsp;' +
    'This is the text that will show up as a label for each person.'+
    '</p> ',

    // Step 2
    '<p>The rectangle information must be stored in the photo file. &nbsp;' +
    ' Either, edit a copy in Photoshop with Lightroom adjustments, select "Save Metadata to File or &nbsp;' +
    ' press Ctrl+S (Windows) or Command+S (Mac OS).</p> '+
    '<p>The metadata "RegionList" can be viewed as in Photoshop under File/File Info/ Raw Data</p>'+
    '<meta name="viewport" content="width=device-width, initial-scale=1"> '+
      '<p><img src="MetaData.png" ></p>' +    
    '</p> ',

    // Step 3
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

    // Step 4
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

    // Step 5
    '<p>After Tagging the Faces, here are some things to try:' +
        '<ul>' +
            ' <li> Under the Facetags group layer, open the Stroke effects to adjust the type of background. </li>'+
            ' <li> Pick different background effects, trying combinations of size and color.</li>'+            
            ' <li> If "Merge Layers" is unchecked, there will be one layer for each individual,  &nbsp;</li>' +
              'Select one or more of these layers to change color and effects for particular individuals.</li>. '+
            ' <li> Manually merge all the layers into the FaceTags layer via the menu item Layers/Merge Group. &nbsp; '+            
            ' NOTE: Clicking on Refresh will delete all edits by rewinding to the initial history state!</li>' +   
        '</ul>'+    
        '</p>' ,

    // Step 6
    '<p>GIF (Graphical Interchange Format)  files are small slideshows that cycle through the frames showing one photo after another. &nbsp; '+
    ' The GIF maker in this program goes through all your photos, finding all those people who have been identified, then it constructs GIFs, &nbsp; '+
    ' using one photo for each person. The  GIF for an individual, such as “Rick Lyman” is stored in a file “Rick Lyman.gif”. &nbsp; '+
    '</p>',

    // Step 7      
 
    '<p>First build an index. In the File Folder dialog box, choose the root of all you photo files. &nbsp; '+
    '  This analyzes all the files and folders under the foot folder.'+
    '<p><img src="Step7a.png">  </p>'+
    '</p>',

     // Step 8
    '<p> Normally, The GIFs are square and contain just the person\'s face in each frame.   However, \"Full Photo\" can be rectangular &nbsp;'+
    'and each full photo is copied into the GIF creating a slideshow. '+
    '<ul>' +
    ' <li> \"GIF Size\" is the number of pixels on a side for the resulting GIFs or it is the maximum width or height of a \"Full Photo\". &nbsp; </li>'+
    ' <li> \"Seconds\/Farme\" is the number of seconds that each frame will display. A small random perturbation is applied&nbsp; '+
    ' so that a matrix of GIFs will blink randomly.</li>'+
    ' <li> \"Days\/Photo\" is the spacing between the \"Data Taken\" of each photo selected.  For instance, to make each photo represent one year ' +
    ' set \"Days\/Photo\" to 365.24. Setting the \"Days\/Photo\" to zero will make a GIF of all photos.</li>'+
    '</ul>'+  
    '</p>',

    // Step 9
    '<p>Now select which people to make GIFs for.  If a single person’s name is selected, then only one GIF will be made. &nbsp; '+
    '  If a keyword has been applied to a number of photos, then GIFs will be made for all the people who were in those photos. &nbsp; ' +
    '  For instance, if all the senior class mugshots have “Senior Class” keyword, the selecting “Senior Class” from  &nbsp; '+
    ' the drop down list will cause GIFs for those people to be made from all the photos in the folder tree.'+
    '</p>',
    
    // Step 10
    '<p>After selecting the keyword, GIF size, and GIF speed parameters, push the Make GIFS button to start the process. '+
    'The output GIFs are placed in a folder underneath the root folder with the same name as the root folder'+
    ' with “-gifs_1” appended to the name. On each run of the program, it detects whether any of the”-gif”'+
    ' folders exist and makes a new one. For instance a second run would have the name “-gifs_2” appended'+
    ' to the root folder name.  This way, there is never a chance of writing over the source photos or previous generated GIFs.'+
    '</p>'

];

/** Create a dialog box
 * 
 * @param {*} i The number of the help page to create.
 * @returns The contents of the dialog box
 */
function helpHtml(i) {
    let y = "";
     if(i<5)
        y= '<sp-button class="btnTest"> Try It </sp-button> ' ;
     let x =/*  '<sp-heading>Step &nbsp;' + (i + 1) + '</sp-heading>' + */
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
            y +                       
            '<sp-button class="btnNext"> Next </sp-button> ' +  
        '</footer>';
    return x;
};

/**
 * Makes an array of Dialog HTML elements, one for each help page
 * @returns dialogs
 *  */
function makeHelpDialogs() {
    let dialogs = new Array();
    for (let i = 0; i < txt.length; i++) {
        let newDialog = document.createElement('DIALOG');
        newDialog.innerHTML = helpHtml(i);
        document.body.appendChild(newDialog);               
        dialogs.push(newDialog);
    }

    /**
     * 
     * @param {*} evt Event that create this call to the function 
     * @returns The dialog page element.
     */
    function dialogE(evt) { return evt.target.parentNode.parentNode }

    // create event listeners for the 4 buttons found at the bottome of the help dialog.

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
    return dialogs;
};


/**
 * Loads an example file and runs the Face Tag
 *  */ 
async function tryIt() {

    const pluginFolder = await fs.getPluginFolder();
    const theTemplate = await pluginFolder.getEntry("1stCommunion1954.jpg");
  
    await app.open(theTemplate);
    await tags.tagSingleFile();
}

module.exports = {
    makeHelpDialogs
}