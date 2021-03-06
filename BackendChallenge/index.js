//import Required Modules
const { response } = require("express");
const express = require("express");
const path = require("path"); //path is a built-in Node module
const mongo = require("mongodb").MongoClient; // import Mongo Module
var ObjectId = require("mongodb").ObjectId; // Import object Id class

const app = express(); //create an Express app and storing it in app variable
const port = process.env.port || 8888; //set up a port number
const mongoUrl = "mongodb://localhost:27017/TrackingInventoryDb"; //path for our mongo. Default port 27017

// Tell express how to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//set up path to important files and folders
app.set("views", path.join(__dirname, "views")); // set Express views to use <app_directory>/views
app.set("view engine", "pug"); // set PUG as the engine to build HTML pages

//Connecting to DB
var db; // variable to hold db instance
var items; //variable to hold items

//Conects to a mongo databse
mongo.connect(mongoUrl, (error, client) => {
  db = client.db("TrackingInventoryDb"); //select which db we are goin to use
  refreshItems();
});

//set up path for static files (e.g. CSS and client-side JS)
app.use(express.static(path.join(__dirname, "public")));

/******** Item Routes *********/

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
  } else {
    response.status(400);
    response.render("error", { error: "Bad Request(400)" });
  }
});

//

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
  console.log(id);
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
  if (
    data._id &&
    data.name &&
    data.description &&
    0 <= data.quantity &&
    data.quantity !== ""
  ) {
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
    quantity: "",
    description: undefined,
  },
  false
);

//***** Shipment Routes *******/
//list all shipments
//API to list all shipments. Return JSON with all shipment information.
app.get("/api/shipment/list", (req, res) => {
  //get all shipments from database
  db.collection("Shipments")
    .find({})
    .toArray((err, shipments) => {
      if (err) {
        res.status(500); // internal error
        throw err;
      }
      res.status(200);
      res.json(shipments); //return json with all shipmment data
    });
});

//Route to List all shipments on a webpage
//returns shipments.pug populated with information collected from API /api/shipment/list
app.get("/shipment/list", (req, res) => {
  //get all shipments from database
  db.collection("Shipments")
    .find({})
    .toArray((err, shipments) => {
      if (err) {
        res.status(500); // inform server had internal error
        res.render("error", { error: "Internal Server Error(500)" });
        throw err;
      }
      res.status(200); //informs it was a success
      res.render("shipments", { shipments: shipments }); //renders shipments.pug with all shipmment data
    });
});

//Route to get page where you can create a new Shipment.
//Permits to select which item and quantity is going to be inserted in the shipment.
app.get("/shipment/add", (req, res) => {
  refreshItems();
  //get all items from the database
  res.render("newShipment", { items: items });
});

//Add new shipment into the database
//Receives data from form on newShipment.pug
//Creates shipment document (JSON)
//Insert it into DB
app.post("/shipment/add", (req, res) => {
  //Creates shipmentItems Json
  //This object has the Object(id) and quantity of items selected for shipment
  let shipmentItemsPartial = req.body.id //foreach req.body.ID
    .map((id, index) => {
      let objId = new ObjectId(id);
      //insert into shipmentItemsPartial {_id: req.body.id, quantity: req.body.quantity}
      return {
        _id: objId,
        quantity: req.body.quantity[index],
      };
    }) //removes from shipmentItemsPartial if quantity <= 0
    .filter((object) => object.quantity > 0);
  //creates Date to creationg_date field
  let date = new Date().toDateString();
  //creates shipment to be inserted on database
  let shipment = {
    creation_date: date,
    total_price:req.body.price
  };
  console.log(shipmentItemsPartial);
  //creates list ob objectId in our order to be used as filter
  let objectsId = shipmentItemsPartial.map((shipmentItem) => {
    return shipmentItem._id;
  });
  //gets items in the shipment order
  //we should not "believe name and description info get from front req"
  //this steps check if required id exists in our database and return cursor for their documents
  const cursor = db.collection("Items").find({ _id: { $in: objectsId } });
  //array for all items in shipment order with complete information
  let shipmentItems = [];
  //function to insert item description, item name and order quantity for each item in shipment
  function iterateFunc(doc) {
    //find correct shipmentItem quantity
    let objItems = shipmentItemsPartial.map((item) => {
      //had problems comparing two objItems, so i converted them to string
      return item._id.toString();
    });
    //find what quantity was requested for item identified by doc._id
    let quantityRequested =
      shipmentItemsPartial[objItems.indexOf(doc._id.toString())].quantity;
    let newAvailableQuantity = +doc.quantity - quantityRequested;
    //Creates item for shipment
    let itemForShipment = {
      _id: doc._id,
      description: doc.description,
      name: doc.name,
      quantity: quantityRequested,
    };
    //Creates item to update database
    let updatedItem = {
      _id: doc._id,
      description: doc.description,
      name: doc.name,
      quantity: newAvailableQuantity,
    };
    
    //updates item collection
    db.collection("Items").findOneAndReplace({ _id: doc._id }, updatedItem);
    refreshItems(); //updates list of items
    //insert item into shipmentItems
    shipmentItems.push({ ...itemForShipment });
    //insert shipmentItems array into shipment.items
    shipment.items = shipmentItems;
    console.log(shipment);
  }
  //retrieves data for each Item found in database which is part of the order
  cursor.forEach(iterateFunc);

  //insert new shipment into database
  db.collection("Shipments").insertOne(shipment, (err, result) => {
    if (err) throw err;
    res.redirect("/shipment/list");
  });
});
