// My own library for an easy component system in JS 🥰
//import { SimpleComps } from 'https://unpkg.com/@sharks-interactive/simple-components@1.1.3/dist/simple-components.min.js';
import { SimpleComps } from "./libs/simple-components.js";
// Init simple Compos library
const sc = new SimpleComps('components/');

/* Trigger init function when the site is done loading
then register HandleBGImage to the windows onresize event */
window.onload = Render;
window.onresize = ResizeBGImage;
window.onhashchange = PageChange;

// Variable Cache
var searchJson;
var pg1;
var pg2;
var loaderElm;
var container;
var myContainer;
var currentLocation = window.location.hash;
var db;

// Called when the window is done loading
function Render() {
    // Tell simple-comps to render our components
    sc.render('search-bar').then(() => {
        sc.render('loader');
        Init();
    });

    sc.render('result-card');

    // Resize BG image to screen size
    ResizeBGImage();
}

// Initialization function, called when the bare document is done rendering
function Init() {
    // Cache refs to dom elements
    const searchBar = document.getElementById('js-book-search');
    loaderElm = document.getElementById('js-loader');
    container = document.getElementById('js-results-container');
    myContainer = document.getElementById('js-books-container');
    pg1 = document.getElementById('js-pg-1');
    pg2 = document.getElementById('js-pg-2');

    // Attach event handlers
    searchBar.onchange = Search;

    // Create database
    let req = indexedDB.open("SavedBooks", 2);

    req.onerror = function (event) {
        alert(`Unable to save that book to your saved books... err ${req.errorCode}`);
    };

    req.onsuccess = function (event) {
        db = event.target.result;
        // Ensure we respond to url onload hashes
        // Done after the DB loads in case your on mybooks page
        PageChange(true);
    }

    req.onupgradeneeded = function (event) {
        db = event.target.result;

        // Create an object store, if one does not exist currently
        if (db.objectStoreNames.contains("books")) return;
        let store = db.createObjectStore("books", { keyPath: "work" });
        store.createIndex("name", "name", { unique: false });
    }
}

// Adds a book to the database of bookmarked books
export function AddBook(book) {
    // Get a ref to the books objectstore and add the elm
    let bookStore = db.transaction(["books"], "readwrite").objectStore("books");
    bookStore.add(book);
}

// Removes a book to the database of bookmarked books
export function RemoveBook(bookKey) {
    // Get a ref to the books objectstore and remove the elm
    let bookStore = db.transaction(["books"], "readwrite").objectStore("books");
    bookStore.delete(bookKey);
}

// Handles changing pages
function PageChange(force) {
    // Don't change page if the location has remained the same and force is false
    if (window.location.hash == currentLocation && !force) return;

    // Home page
    if (window.location.hash == '' || window.location.hash == '#') {
        // Show pg1, hide pg2
        pg1.style.display = 'block';
        pg2.style.display = 'none';
    } // My books page
    else if (window.location.hash == '#mybooks') {
        // Hide pg1, show pg2 and re populate the books
        pg1.style.display = 'none';
        pg2.style.display = 'block';
        PopulateBooks();
    }
}

// Resizes the background image
function ResizeBGImage() {
    // Get a ref to BG image and Resize it to screen size
    const bgImage = document.getElementById('js-bg-img');
    // Good looking image ids that work well with our color pallete
    const imgId = ['269', '266', '220', '278', '1003', '279', '271', '272'];
    bgImage.src = `https://picsum.photos/id/${imgId[Math.floor(Math.random() * imgId.length)]}/${window.innerWidth}/${window.innerHeight}`;
}

// Called when the user types into the search bar
async function Search(event) {
    // Remove previous results... If there are any
    DeleteAllChildrenOf(container);

    // Starting a request.. show the loader
    loaderElm.style.display = 'block';

    // Request the openlibrary api
    fetch(`https://openlibrary.org/search.json?q=${event.srcElement.value}`)
        .then(response => response.json())
        .then(data => {
            // Loading done.. hide the loader
            loaderElm.style.display = 'none';

            // Populate the dom with the results of our search
            PopulateResuts(data);
        });
}

// Deletes all the children of an element
function DeleteAllChildrenOf(elm) {
    while (elm.firstChild)
        elm.removeChild(elm.firstChild);
}

// Empty card Data template to clone
const cardData = {
    attrs: [

    ]
}

// Handles populating the my books page
function PopulateBooks() {
    // Remove any previously existing books
    DeleteAllChildrenOf(myContainer);

    // Get a reference to the books objectstore
    let bookStore = db.transaction(["books"], "readwrite").objectStore("books");
    var objectStoreRequest = bookStore.getAll();

    objectStoreRequest.onsuccess = function (event) {
        let data = objectStoreRequest.result;

        let dataObj = {
            l: [

            ]
        };

        // Generate data object with info about books from the db
        for (let c = 0; c < data.length; c++) {
            dataObj.l[c] = JSON.parse(JSON.stringify(cardData));
            dataObj.l[c].attrs[0] = `heading|${data[c].name}`;
            dataObj.l[c].attrs.push(`description|${data[c].description == undefined ? "No Tags" : data[c].description}`);
            dataObj.l[c].attrs.push(`coverId|${data[c].cover}`);
            dataObj.l[c].attrs.push(`key|${data[c].work}`);
            dataObj.l[c].attrs.push(`year|${data[c].year}`);
            dataObj.l[c].attrs.push(`author|${data[c].author}`);
            dataObj.l[c].attrs.push(`pages|${data[c].pages}`);
            dataObj.l[c].attrs.push(`ebook|${data[c].ebook}`);
            dataObj.l[c].attrs.push(`hardcover|${data[c].hardcover}`);
            dataObj.l[c].attrs.push(`langs|${data[c].langs}`);
            dataObj.l[c].attrs.push(`goodreads|${data[c].goodreads}`);
            dataObj.l[c].attrs.push(`goodreadsAvailiable|${data[c].goodreadsAvailiable}`);
            dataObj.l[c].attrs.push(`placeholderDesc|Fetching description...`);
            dataObj.l[c].attrs.push('class|my-card');
            dataObj.l[c].attrs.push('style|background-color: #24292f;');

            dataObj.l[c].attrs.push((c == 0 ? 'firstCard|true' : 'firstCard|false'));
            dataObj.l[c].attrs.push(`i|${c}`);
        }

        // Have simple comps create our books components and render them
        sc.create('mybook', data.length, myContainer, dataObj);
        sc.render('mybook');
    };
}

// Populates components on the results page
async function PopulateResuts(data) {
    let dataObj = {
        l: [

        ]
    };

    // Generate data object with data from the search
    for (let c = 0; c < data.docs.length; c++) {
        dataObj.l[c] = JSON.parse(JSON.stringify(cardData));
        dataObj.l[c].attrs[0] = `heading|${data.docs[c].title}`;
        dataObj.l[c].attrs.push(`description|${data.docs[c].subject == undefined ? "No tags" : data.docs[c].subject}`);
        dataObj.l[c].attrs.push(`author|${data.docs[c].author_name == undefined ? "No known authors" : data.docs[c].author_name}`);
        dataObj.l[c].attrs.push(`coverId|${data.docs[c].cover_i}`);
        dataObj.l[c].attrs.push(`key|${data.docs[c].key}`);
        dataObj.l[c].attrs.push(`year|${data.docs[c].first_publish_year == undefined ? "No data" : data.docs[c].first_publish_year}`);
        dataObj.l[c].attrs.push(`pages|${data.docs[c].number_of_pages_median == undefined ? "No data" : data.docs[c].number_of_pages_median}`);
        dataObj.l[c].attrs.push(`ebook|${data.docs[c].ebook_count_i}`);
        dataObj.l[c].attrs.push(`hardcover|${data.docs[c].edition_count}`);
        dataObj.l[c].attrs.push(`langs|${data.docs[c].language}`);
        dataObj.l[c].attrs.push(`goodreads|${data.docs[c].id_goodreads == undefined ? "None" : data.docs[c].id_goodreads[0]}`);
        dataObj.l[c].attrs.push(`goodreadsAvailiable|${data.docs[c].id_goodreads != undefined}`);
        dataObj.l[c].attrs.push(`placeholderDesc|Fetching description...`);

        dataObj.l[c].attrs.push((c == 0 ? 'firstCard|true' : 'firstCard|false'));
        dataObj.l[c].attrs.push(`i|${c}`);
    }

    // If no results are found...
    if (data.docs.length == 0) {
        let customAttrs = {
            l: [
                {
                    attrs: [
                        'heading|No results found!',
                        'description|Check your spelling or try again.',
                        'i|00',
                        'placeholderDesc|We couldn\'t find that book in our library. Maybe try a synonym?'
                    ]
                }
            ]
        }

        // Create & render the single element
        sc.create('result-card', 1, container, customAttrs);
        sc.render('result-card');
    } else {
        // Create & render 100 result components
        sc.create('result-card', data.docs.length, container, dataObj);
        sc.render('result-card');
    }
}

/**
 * Parses the description data from openlibrary, [replacing][1] items with their respective [1][link.com]
 * Defined at the end of the raw data
 * @param {string} data Raw Input Data
 * @returns {string} The Parsed Data
 */
export function ParseData(data) {
    // If data is not valid return a default description
    if (data == undefined) return "No description available...";
    if (data.value != undefined) data = data.value; // Get child
    const links = data.match(/\[(.?)\]\:.+/g); // Get all the links in the desc
    if (links == undefined) return data;
    data = data.replace(/\[(.?)\]\:.+/g, ''); // Remove them from the desc

    // Loop through each link
    for (let x = 0; x < links.length; x++) {
        const link = links[x]; // Cache link
        const num = link.match(/(?<=\[).+?(?=\]\:)/g); // Get just the bracket number
        if (num == undefined) return data; // Error
        const href = link.replace(/\[(.+?)\]\:/g, ''); // Get just the link

        const modifiers = data.match(new RegExp(`\\[(.[^[]+?)\\]\\[` + num + `\\]`, 'g')); // Find every modifier
        if (modifiers == undefined) return data; // Error
        data = data.replace(new RegExp(`\\[` + num + `\\]`, 'g'), ''); // Remove brackets

        // Add modifiers together
        let combinedDat = '';
        for (let d = 0; d < modifiers.length; d++) combinedDat += modifiers[d];

        // Get labels from our combined modifiers, then loop through & replace them
        const labels = combinedDat.match(/\[(.+?)\]/g);
        for (let z = 0; z < labels.length; z++) {
            let original = labels[z]; // Cache ref
            // Replace with html link elements
            labels[z] = labels[z].replace(/\[/g, '<a href=\'' + href + '\'>');
            labels[z] = labels[z].replace(/\]/g, '</a>');

            // Replace data with our new version
            data = data.replace(original, labels[z]);
        }
    }
    return data;
}
