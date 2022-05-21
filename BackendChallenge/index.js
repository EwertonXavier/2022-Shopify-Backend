//import Required Modules
const express = require("express");
const path = require("path"); //path is a built-in Node module
const mongo = require("mongodb").MongoClient; // import Mongo Module
var ObjectId = require("mongodb").ObjectId; // Import object Id class

const app = express(); //create an Express app and storing it in app variable
const port = process.env.port || 8888; //set up a port number
const mongoUrl = "mongodb://localhost:27017/TrackingInventoryDb"; //path for our mongo. Default por 27017

// Tell express how to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//set up path to important files and folders
app.set("views", path.join(__dirname, "views")); // set Express views to use <app_directory>/views
app.set("view engine", "pug"); // set PUG as the engine to build HTML pages

//Connecting to DB
var db; // variable to hold db instance
var items; //variable to hold menu links because this is data common on all pages

//Conects to a mongo databse
mongo.connect(mongoUrl, (error, client) => {
  db = client.db("TrackingInventoryDb"); //select which db we are goin to use
  refreshItems();
});

//set up path for static files (e.g. CSS and client-side JS)
app.use(express.static(path.join(__dirname, "public")));

/********Routes *********/

//Reponds request to the inital route
//returns index.pug page
app.get("/", (request, response) => {
  response.render("index", { title: "Home Page" });
  console.log("Requested");
  //do something in here for the / page route
  response.status(200);
});

//Respond to items on route /item/list
//returns items.pug page
app.get("/item/list", (request, response) => {
  refreshItems();
  response.render("items", { title: "List Items Page", items: items });
  console.log("Requested items page: " + items);
  response.status(200);
});

//Respond to items on route /item/edit
//Gets id from form submited on page /items/list and creates a edit page with this info
//returns edit.pug page
app.get("/item/edit", (request, response) => {
  let id = new ObjectId(request.query.id);
  let item;
  console.log(id);
  db.collection("Items")
    .find({ _id: id })
    .toArray((err, res) => {
      item = res[0]; //get all documents in items and make it in an array
      response.render("edit", { title: "Edit Item", item: item });
    });
});
//Respond to post requests made on route /item/edit
//Gets creates a replacement for the document using form data and replace it on the database
//Success: redirects to /item/list
//Failed: renders to error.pug
app.post("/item/edit", (request, response) => {
  let id = new ObjectId(request.body.id);
  let replace = {
    //new document
    _id: id,
    name: request.body.name,
    quantity: request.body.quantity,
    description: request.body.desc,
  };
  //checks if replacement item is valid before updating the database
  if (validateItem(replace)) {
    //find and replace item on Items collection
    db.collection("Items").findOneAndReplace(
      { _id: id },
      replace,
      (err, result) => {
        if (err) throw err;
        console.log(result);
        refreshItems(); //updates items displayed on /item/list
        response.status(200); //reponse status
        response.redirect("/item/list"); //redirects to /item/list
      }
    );
  }else{
    response.status(400);
    response.render("error",{error: "Bad Request(400)"})
  }
});

//responds to Get request ant /item/add
//Returns add.pug page which is used to add items
app.get("/item/add", (request, response) => {
  response.render("add", { title: "Add Page" });
  response.status(200);
});

//Adds a new Item to the inventory
//receives name, description and quantity from request.body and insert it into database.
//Success: redirects to /item/list
//Fail: renders error.pug
app.post("/item/add", (request, response) => {
  //creates json data from request body
  let data = {
    name: request.body.name,
    description: request.body.desc,
    quantity: request.body.quantity,
  };
  //validates input before adding to database: Backend Validation
  if (validateItem(data)) {
    //insert new item into collection
    db.collection("Items").insertOne(data, (err, result) => {
      if (err) throw err;
      //update list of items
      refreshItems();
      //redirects to route /item/list
      response.redirect("/item/list");
    });
  } else {
    response.status(400); //bad request
    response.render("error", { error: "Bad Request(400)" });
  }
});

//Delete an item from the database.
//Receives item id from request body and delete it from the database.
//Redirects to  /item/list
app.post("/item/delete", (request, response) => {
  console.log(request.body.id);
  let id = new ObjectId(request.body.id);
  //delete id from DB
  db.collection("Items").deleteOne({ _id: id }, (err, result) => {
    if (err) throw err;
    //update list of items
    refreshItems();
    //redirects to /item/list
    response.redirect("/item/list");
  });
});

//set up server listener
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

//function to update list of items
function refreshItems() {
  db.collection("Items") //select which collection we are going to use
    .find({}) //select all
    .toArray((err, res) => {
      items = res; //get all documents in items and make it in an array
    });
}
//Function to make sure Items fields are valid.
// Used before editing or adding item to database
function validateItem(data) {
  //list of validations I judged would make an Item invalid
  if (data._id && data.name && data.description && 0 <= data.quantity && data.quantity!=='') {
    return true;
  }
  return false;
}

/* Test Function to validateItem(date)*/
function test_validateItem(input, expect) {
  let validationResult = validateItem(input);
  let testResult;
  if (expect === validationResult) {
    testResult = "Passed";
  } else {
    testResult = "Failed";
  }
  console.log(
    "input: " + input + " expect: " + expect + " Test result:" + testResult
  );
}
//Testing validateItem(data) function
//test to success: valid input
test_validateItem(
  {
    _id: "123124",
    name: "Item name",
    quantity: 10,
    description: "Item Description",
  },
  true
);
//test to fail: invalid id
test_validateItem(
  {
    _id: "",
    name: "Item name",
    quantity: 10,
    description: "Item Description",
  },
  false
);
//test to fail: invalid name
test_validateItem(
  {
    _id: "123123",
    name: null,
    quantity: 10,
    description: "Item Description",
  },
  false
);
//test to fail: invalid quantity
test_validateItem(
  {
    _id: "123123",
    name: "Item name",
    quantity: -1,
    description: "Item Description",
  },
  false
);
//test to fail: invalid description
test_validateItem(
  {
    _id: "123123",
    name: "Item name",
    quantity: 1,
    description: undefined,
  },
  false
);
//test to fail: blank quantity
test_validateItem(
  {
    _id: "123123",
    name: "Item name",
    quantity: '',
    description: undefined,
  },
  false
);


