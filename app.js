if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const express = require("express");
const req = require("express/lib/request");
const res = require("express/lib/response");
const app = express();
var mysql = require('mysql2');
const {body, validationResult} = require("express-validator");
const bodyParser = require("body-parser");
const { redirect } = require('express/lib/response');
const session = require('express-session');

//Establishing connection with database
var con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '7714',
  database: 'shopdatabase',
  multipleStatements: true
});

//EJS files to dynamically create and display content on the webpage
app.set('view engine', "ejs");

//Setting up midddleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}))
app.use(express.static(__dirname + '/public'));


//Binding to port 3000
app.listen(3000, function(){
  console.log("server is running on port 3000");
})

//GET request route defined for the registration page
app.get('/register', function(req, res) {
  res.render('register.ejs');
});

//POST request route defined for the registration page which collects data from the user
app.post('/register', function(req, res) {
  //Extracting user input and assigning them to variables 
  var name = req.body.name;
  var username = req.body.username;
  var email = req.body.email;
  var pw = req.body.pw;

  //Checking whether the user has inputted the non compulsory field "Number" and converting it to a number if true or setting it to NULL
  if(req.body.number != null) { 
    var number = req.body.number
    number = Number(number);
  }
  else {
    var number = null;
  }

  //Defining array for ease of iterating later on
  let values = [name, username, email, pw, number]

  //Building SQL query string to check whether user with entered username already exists in database
  let check1 = `SELECT cust_username FROM Customer_Data WHERE cust_username = ` + mysql.escape(values[1]);
  con.query(check1, function(err, result1, fields) {
    if(err) throw err;

    //If result value greater than 1 i.e. username exists in database then reroute user to registration failure page else continue
    if(Object.keys(result1).length > 0) {
      res.redirect('/regfail1');
    }
    else {
      //Building SQL query string to check whether user has already registered with entereed email address 
      let check2 = `SELECT cust_email FROM Customer_Data WHERE cust_email = ` + mysql.escape(values[2]);
      con.query(check2, function(err, result2, fields) {
        if(err) throw err;
        //If result value greater than 1 i.e. username exists in database then reroute user to registration failure page else continue
        if(Object.keys(result2).length > 0) {
          res.redirect('/regfail2');
        }
        else {
          //Building SQL query string to enter user input values into the database
          let qstring = ""
          for (let i = 0; i< values.length; i++) {
          if(i == values.length-1) {
            qstring += mysql.escape(values[i]);
            continue; 
          }
          qstring += ("'" + values[i]+"',");
          }
          query = "INSERT INTO Customer_Data(cust_name, cust_username, cust_email, cust_pw, cust_number) VALUES("+ qstring + ");";
          con.query(query, function (err, results, fields) {
          if(err) throw err;

          //If registration is successful, rerouting user to login page
          res.redirect('/login');
      })
    }
  })
    }
})
});

//GET request route defined for the registration failure page which is displayed when username is already taken
app.get('/regfail1', function(req, res) {
  res.render('regfail1.ejs');
});

//GET request route defined for the registration failure page which is displayed when user with entered email already exists
app.get('/regfail2', function(req, res) {
  res.render('regfail2.ejs');
});

//GET request route defined for the login page
app.get('/login',function(req,res) {
  res.render('login.ejs');
});

//POST request route and callback function defined for the login page which collects data from user and checks verifies it against data in the database 
app.post('/login', function(req, res) {
  
  //Extracting user input and assigning them to variables 
  var username = req.body.username;
  var user_password = req.body.password;

  //Checking if both usernname and password are entered
  if(username && user_password) {

    //Building SQL query string to check if entered username exists in database
    let query = `SELECT * FROM Customer_Data WHERE cust_username =` + mysql.escape(username)
    con.query(query, function(err, result, fields) {
      if(err) throw err;

      //If the result length is greater than 1 i.e. user exists, continue 
      if(result.length > 0) {
        for(let i = 0; i < result.length; i++) {

          //If entered username and password match the username and passwords entered, set the session user ID as the user ID present in the database and redirect the user to the homepage
          if(username === result[i].cust_username) {
            if(user_password === result[i].cust_pw) {
              req.session.user_id = result[i].user_id;
              res.redirect('/');
            }
            else {

              //Error message when password does not match with username
              res.send('Password entered is incorrect!');
              res.end();
            }
          }
        }
      }
      else {

        //Error message when user with username does not exist
        res.send('No user found with this username!')
      }
      res.end();
    })
  }
})

//GET request route and callback function defined for the homepage for both shopkeeper and the customer
app.get('/',function(req,res) {

  //If the session user ID is not undefined, i.e. user has logged in and is authenticated then continue else redirect the user to the login page
  if(req.session.user_id != undefined) {

    //If session user ID is equal to 1, which is the user ID value (hard coded in the database) of the shopkeeper, display the shop dashboard
    if(req.session.user_id == 1) {
      res.render('shopdashboard.ejs')
    }
    else {

    //Building SQL query string to retreive the details of the customer user who has logged in
    let pointsquery = `SELECT cust_points, cust_name FROM Customer_Data WHERE user_id =` + mysql.escape(req.session.user_id);
    con.query(pointsquery, function(err, result, fields) {
      if(err) throw err;

      //Extracting customer user input and assigning them to variables
      var name = result[0].cust_name;
      var points = result[0].cust_points;

      //Building SQL query string to retreive all the transactions of the customer user  
      let transquery = `SELECT trans_id, SUM(trans_cost) as total_cost, trans_date FROM Transaction_Data WHERE trans_cust_id = `+ req.session.user_id + ` GROUP BY trans_id;`;
      con.query(transquery, function(err, result, fields) {
        if(err) throw err;

        //Passing the result of the query along with the customer user details to be rendered on the homepage
        var cust_transactions = result;
        res.render('dashboard.ejs', {session : req.session, user: name, points: points, transactions: cust_transactions});
      })
  }) 
  }
}
else {
  //Redirecting unauthorized user to login page
  res.redirect('/login');
}
});

//GET request route and callback function defined for the page to display all the details of an individual transaction (for both customer and shopkeeper)
app.get('/transactions/:trans_id', function(req, res) {

  //If the session user ID is not undefined, i.e. user has logged in and is authenticated then continue else redirect the user to the login page
  if(req.session.user_id != undefined) {

    //Assigning the transaction ID passed as an paramter in the URL to variable 
    var t_id = req.params[`trans_id`];

    //Building SQL query string to retreive the customer ID of the transaction ID passed as a parameter in the URL 
    let checkuser = `SELECT trans_cust_id FROM Transaction_Data WHERE trans_id = ` + mysql.escape(t_id);
    con.query(checkuser, function(err, result, fields) {

      //If the customer ID of the logged in user and the transaction customer ID match then continue, else display error message
      if(result[0].trans_cust_id === req.session.user_id) {

        //Building SQl query string to retreive the transaction details of the the transaction ID passed as a paramter in the URl
        let gettrans = `SELECT transaction_data.* , Inventory_data.item_name FROM transaction_data, inventory_data WHERE trans_id = ` + mysql.escape(t_id) +` AND inventory_data.item_id = transaction_data.trans_item_id`; 
        con.query(gettrans, function(err, result, fields) {

          //If the length of the result of the query is greater than 0, i.e. the transaction exists, constinue
          if(Object.keys(result).length > 0) {

            //Building SQL query string to retreibe the total cost of the transaction
            let findtotal = `SELECT sum(trans_cost) as total FROM transaction_data WHERE trans_id = ` + mysql.escape(t_id);
            con.query(findtotal, function(err, result2, fields) {

              //Passing the transaction details and the the total cost of the transaction to display them on the page
              res.render(`transaction.ejs`,{session: req.session, values: result, total: result2[0].total});
            })
          }
          else {

            //Error message to be displayed when either the transaction does not exist
            res.send('This transaction does not exist!');
          }
        } )
      }
      else {

        //Redirecting user to the homepage if the user is not authorized to view the transaction
        res.redirect('/');
      }
    })
  }
  else {

    //Redirecting user to the homepage if the user is not authorized to view the transaction
    res.redirect('/');
  }

})

//GET request route and callback function defined for the shop dashboard (homepage for the shopkeeper)
app.get('/shopdashboard', function(req, res) {
  
  //If the user is not the shopkeeper, then redirect back to homepage else display the shop dashboard
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {
    res.render('shopdashboard.ejs', {session : req.session});
  }
})

//GET request route and callback function defined for the page to display customer data
app.get('/custdata', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    //Building SQL query to retreive relevant data of all customers   
    let getcustdata = `SELECT cust_name, cust_username, cust_number, cust_points, cust_amount_spent FROM Customer_Data WHERE user_id != 1;`;
    con.query(getcustdata, function(err, result, fields) {
      if(err) throw err;

      //Passing result of query to be displayed on the customer data page
      res.render('custdata.ejs', {session: req.session, values : result});
    })
  }
})

//POST request route and callback function defined for customer data page to delete user data
app.post('/custdata', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    //Building SQL query to delete specified customer user data from the database which is specified by the shopkeeper
    let deleteuser = `DELETE FROM Customer_Data WHERE  cust_username = ` + mysql.escape(req.body.user);
    con.query(deleteuser, function(err, result, fields) {
      if(err) throw err;

      //Reloading the page with updated data
      res.redirect('/custdata');
    })
  }
})

//GET request route and callback fucntion defined for page to display shop inventory data
app.get('/inventory-data', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    //Building SQL query string to retreive all inventory data from the database
    let getinventorydata = `SELECT * FROM Inventory_Data;`;
    con.query(getinventorydata, function(err, result, fields) {
      if(err) throw err;

      //Passing result of query to be displayed on the inventory data page
      res.render('inventory-data.ejs', {session: req.session, values: result});
    })
  }
})

//POST request route and callback fucntion defined for inventory data page to delete inventory data
app.post('/inventory-data', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {
     
    let values = []

    // Converting the incoming body object with item IDs and deletion quantities to an JSON string
    var body = JSON.parse(JSON.stringify(req.body)); 

    //Looping over the JSON string key values to check if a number has been passed with the item ID as the key value, i.e. the number of that item ID to be deleted
    for (var key in body) {
    if (body.hasOwnProperty(key)) {
      if(body[key] != '') values.push(Number(body[key]));
      else values.push(-1);
    }
  }
  //The resultant array values[] now contains the number of items to be deleted at the index of the array which is also the the item ID of the item.
  //Example 1: if values[1] = 10, that means the quantity of the item with item ID 2 is to be reduced by 10.
  //Example 2: if values[6] = -1, that means the quantity of the item with item ID 7 remains unaffected.


  //Iterating over the above created array 
  for(let i = 0; i<values.length; i++) {

    //Checking if the given item ID is to be deleted or not
    if(values[i] != -1) {

      //Building SQL query to retreive the item quantity of the item ID specified for deletion
      let check = `SELECT item_quantity FROM Inventory_Data WHERE item_id = ${i+1}`;
      con.query(check, function(err, result, fields) {

        //Checking whether the current quantity of item is more than the specified deletion quantity, if yes then continue
        if(result[0].item_quantity >= values[i]) {

          //Building SQL query to delete item quantity with specified item ID
          let delitemquery = `UPDATE Inventory_Data SET item_quantity = item_quantity - ${values[i]} WHERE item_id = ${i+1}`;
          con.query(delitemquery, function(err, result, fields) {
              if(err) throw err;
            })
          }
        })
      }
    }
    //Reloading the inventory data page with udpated data
    res.redirect('/inventory-data');
  }
})

//GET request route and callback function defined for the page to display the form to add existing items to inventory
app.get('/additems', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    //Building SQL query string to retreive all inventory data from the database
    let getinventorydata = `SELECT * FROM Inventory_Data;`;
    con.query(getinventorydata, function(err, result, fields) {
      if(err) throw err;

      //Passing result of query to be displayed on the page
      res.render('additems.ejs', {session: req.session, values: result});
    })
  }
})

//POST request route and callback function defined for page to add existing items to inventory
app.post('/additems', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    
    let values = [];

    // Converting the incoming body object with item IDs and addition quantities to an JSON string
    var body = JSON.parse(JSON.stringify(req.body));

    //Looping over the JSON string key values to check if a number has been passed with the item ID as the key value, i.e. the number of that item ID to be added
    for (var key in body) {
    if (body.hasOwnProperty(key)) {
      if(body[key] != '') values.push(Number(body[key]));
      else values.push(-1);
    }
  }
  //The resultant array values[] now contains the number of items to be deleted at the index of the array which is also the the item ID of the item.
  //Example 1: if values[1] = 10, that means the quantity of the item with item ID 2 is to be increased by 10.
  //Example 2: if values[6] = -1, that means the quantity of the item with item ID 7 remains unaffected.
  
  //Iterating over the above created array 
  for(let i = 0; i<values.length; i++) {

    //Checking if the given item ID is to be deleted or not
    if(values[i] != -1) {

      //Building SQL query to retreive the item quantity of the item ID specified for increment
      let check = `SELECT item_quantity, item_name FROM Inventory_Data WHERE item_id = ${i+1}`;
      con.query(check, function(err, result, fields) {

        //Checking whether the value specified is postive or not, if yes continue
        if(values[i] >= 0) {

          //Building SQL query to add item quantity with specified item ID
          let additemquery = `UPDATE Inventory_Data SET item_quantity = item_quantity + ${values[i]} WHERE item_id = ${i+1}`;
          con.query(additemquery, function(err, result, fields) {
              if(err) throw err;
            })
          }
        })
      }
    }
    //Reloading the page with updated data
    res.redirect('/additems');
  }
})

//GET request route and callback function defined for the page to display the form to add new items to inventory
app.get('/addnew', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {
    //Display the page to user
    res.render('addnew.ejs', {session: req.session});
  }
})

//POST request route and callback function defined for page to add new items to inventory
app.post('/addnew', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    //Extracting values passed by user and assigning them to variables
    var name = req.body.item_name;
    var cost = req.body.item_cost;
    var quantity = req.body.item_quantity;

    //Building SQL query string to insert new item data into the inventory database
    let addnewitem = `INSERT INTO Inventory_Data (item_name, item_cost, item_quantity) VALUES (`+mysql.escape(name)+`,`+mysql.escape(cost)+`, `+mysql.escape(quantity)+`);`;
    con.query(addnewitem, function(err, result, fields) {
      if(err) throw err;
    })

    //Redirectng user to inventory data page to display page with updated data
    res.redirect('/inventory-data');
  }
})

//GET request route and callback function defined for the ledger page to display all transaction data
app.get('/ledger', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    //Building SQl query string to retrieve overall details of all transactions 
    let getledger = `SELECT trans_id, trans_cust_id, SUM(trans_cost) as total_cost, trans_date FROM Transaction_Data GROUP BY trans_id ORDER BY trans_date DESC;`;
    con.query(getledger, function(err, result, fields){
      if(err) throw err;

      //Passing the result of the query and displaying the transaction data on the page
      res.render('ledger.ejs', {session: req.session, values: result});
    })
  }
})

//GET request route and callback function defined for the page to display all the details of an individual transaction
app.get('/ledger/:trans_id', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {
  
  //Assigning the transaction ID passed as an paramter in the URL to variable 
  var t_id = req.params[`trans_id`];

  //Building SQL query string to retrieve individual transaction data from the database
  let checktrans = `SELECT transaction_data.* , Inventory_data.item_name FROM transaction_data, inventory_data WHERE trans_id = ` + mysql.escape(t_id) +` AND inventory_data.item_id = transaction_data.trans_item_id`; 
  con.query(checktrans,  function(err, result, fields) {

    //Checking if transaction with specified transaction ID exists, if yes, continue
    if(Object.keys(result).length > 0) {

      //Building SQL query string ot retrieve the totol cost of the entire transaction
      let findtotal = `SELECT sum(trans_cost) as total FROM transaction_data WHERE trans_id = ` + mysql.escape(t_id);
      con.query(findtotal, function(err, result2, fields) {

        //Passing the results of the queries and displaying the transaction data on the page
        res.render(`transaction.ejs`,{session: req.session, values: result, total: result2[0].total});
      })
    }
    else {
      //Error message displayed if the transaction with specified transaction ID does not exist
      res.send('This transaction does not exist!');
    }
  })
}
})

//GET request route and callback function defined for the page to display a form to add a new transaction
app.get('/addtransaction', function(req, res){

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {

    //Building SQL query string to retreive all the inventory data from the database
    let getitems = `SELECT * FROM Inventory_Data;`;
    con.query(getitems, function(err, result, fields) {
      if(err) throw err;

      //Passing result of the query and displaying the page
      res.render('addtransaction.ejs', {session: req.session, values: result});
    })
  }
})

//POST request route and callback function defined for the page to add a new transaction
app.post('/addtransaction', function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {
    let values = []

    // Converting the incoming body object into an JSON string
    var body = JSON.parse(JSON.stringify(req.body));

    //Looping over the JSON string key values to check if a number has been passed with the item ID as the key value, i.e. the number of that items of that item ID to be added to the transaction.
    let j =1;
    for (var key in body) {
    if (body.hasOwnProperty(key)) {
      if(isNaN(body[key])) {
        continue;
      }
      if(body[key] != '') {
        values.push([j, Number(body[key])]);
        j++ 
      }
      else {
        j++
      }
    }
    }
    //The resultant 2D array values[][] now contains the item IDs and the total quantities for all the items incldued in the transaction
    
    //Building an SQL query string by chaining multiple queries (one for each item in the transaction) into a single string to retrieve the inventory data to generate the final bill
    let query = ""
    for(let i=0; i<values.length; i++) {
      query+= `SELECT item_id, item_name, ${values[i][1]} as Quantity, (SELECT item_cost * ${values[i][1]} FROM Inventory_Data WHERE item_id = ${values[i][0]}) as Total_Cost FROM Inventory_Data WHERE item_id = ${values[i][0]};`;
    }
      con.query(query, function(err, result, fields) {
      let total = 0;
      let items = [];

      //If the transactionn has a single unique item i.e. there is just one query, the resultant object is like a 1D array and the result values has to be accessed as follows
      if(result.length === 1) {
        total+= Number(result[0].Total_Cost);
        items.push(result[0]);
      }

      //If the transaction has multiple items, the resultant object is like a 2D array and the result values have to be accessed as follows
      else {

      //Calculating the total cost of the transaction and details of all the items are pushed in the array by looping over the result object
      for(let i =0; i<result.length; i++) {
        total += Number(result[i][0].Total_Cost);
        items.push(result[i][0]);
      }
    }

      //Passing array of details of the items along with the total cost of the transaction to the page displaying the final bill of the transaction 
      res.render('confirm.ejs', {session: req.session, values: items, total_cost: total});
      })
  }
})

//GET request route and callback function defined for the page to display the page to confirm the transaction
app.get('/result', function(req, res){

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {
    res.render('shopdashboard.ejs', {session: req.session});
  }
})

//POST request route and callback function defined for the page to confirm the transaction
app.post('/result',function(req, res) {

  //If the user is not the shopkeeper, then redirect back to homepage
  if(req.session.user_id != 1) {
    res.redirect('/');
  }
  else {
    //Building SQL query string to check whether the customer user entered exists to confirm the transaction
    let checkuser = `SELECT * FROM Customer_Data WHERE cust_username = ` + mysql.escape(req.body.cust_username);
    con.query(checkuser , function(err, result, fields) {
      if(err) throw err;

      //If the length of the result of the query is greater than 1, i.e the user exists, continue
      if(Object.keys(result).length > 0) {
        //Checking the mode of payement selected, if it is cash, then continue
        if(req.body.via === 'cash') {

        //Building SQL query string to retreive the amount of money the customer has spent before in the shop  
        let oldamount =  `SELECT cust_amount_spent FROM Customer_Data WHERE cust_username = `+ mysql.escape(req.body.cust_username);
        con.query(oldamount, function(err, result, fields) {
          if(err) throw err;

          //Calculating the points of the customer before and after which the transaction takes place 
          let oldp =  Math.floor((result[0].cust_amount_spent)/100);
          let newp = Math.floor((Number(result[0].cust_amount_spent) + Number(req.body.total_cost))/100);

          //If there is a difference in the amount of old and new points, continue to update the points
          if(newp > oldp) {

            //Building SQL query string to update the points of the customer
            let pointsupdate = `UPDATE Customer_Data SET cust_points = cust_points + `+ (newp - oldp) +' WHERE cust_username = '+mysql.escape(req.body.cust_username);
            con.query(pointsupdate, function(err, result, fields) {
              if(err) throw err;
            } )
          }
          
          //Building SQL query string to update the customer total amount spent 
          let custupdate = `UPDATE Customer_Data SET cust_amount_spent = cust_amount_spent +`+ req.body.total_cost +' WHERE cust_username = '+mysql.escape(req.body.cust_username);
              con.query(custupdate, function(err, result, fields) {
                if(err) throw err;
          })

          //Building SQL string to see the last conducted transaction and accordingly generate the new transaction ID
          let ledgercheck = 'SELECT COUNT(DISTINCT trans_id) AS dis FROM Transaction_Data';
          con.query(ledgercheck, function(err, result, fields) {
            if(err) throw err;

            //Generating the transaction ID and assiging it to a variable
            let t_id = "T" + String(result[0].dis+1);

            //Converting the incoming body object with details of the items in the transaction to an JSON string 
            var body = JSON.parse(JSON.stringify(req.body));

          
            //Defining arrays to store the item IDs, item costs and item quantities seperately (the same index of the arrays will contain details of the same item)
            let ids = []
            let costs = []
            let quantities = []
          
            //Looping over the JSON string key values and filling up the three arrays with appropriate values
            for(let i = 0; i<Math.floor((Object.keys(req.body).length-3)/3); i++) {
              var key = 'item'+(i+1);
              ids.push(body[key]);
            }
            for(let i = 0; i<Math.floor((Object.keys(req.body).length-3)/3); i++) {
              var key = 'cost_of_item'+(i+1);
              costs.push(body[key]);
            }
            for(let i = 0; i<Math.floor((Object.keys(req.body).length-3)/3); i++) {
              var key = 'quantity'+(i+1);
              quantities.push(body[key]);
            }

            //Looping over the arrays, building SQL query on every iteration to update the ledger data, one item of the transaction at a time
            for(let i = 0; i<ids.length; i++) {
              let ledgerupdate = `INSERT INTO Transaction_Data VALUES('${t_id}', NOW(), (SELECT user_id FROM Customer_Data WHERE cust_username =  `+ mysql.escape(req.body.cust_username)+`), ${ids[i]},${quantities[i]}, ${costs[i]});`
              con.query(ledgerupdate, function(err, results, fields) {
                if (err) throw err;
              })
            }

            //Looping over the arrays, building SQL quuery on every iteration to update the inventory data, one item of the transaction at a time
            for(let i =0; i<ids.length; i++) {
              let inventoryupdate = `UPDATE Inventory_Data SET item_quantity = item_quantity - ` + quantities[i] +` WHERE item_id = ${ids[i]} `;
              con.query(inventoryupdate, function(err, result, fields) {
                if(err) throw err;
              }) 
            }
          })

        //Redirecting shopkeeper user to the ledger with the updated transaction data
        res.redirect('/ledger');
        })
      }
      //If the mode of payment of the customer is points (instead of cash)
        else {

          //Building SQL query string to retreive the current points of the customer from the database
          let checkpoints =  `SELECT cust_points FROM Customer_Data WHERE cust_username = `+ mysql.escape(req.body.cust_username);
          con.query(checkpoints, function(err, result, fields) {
            if(err) throw err;

            //Checking the customer has more points than the required for the transaction
            if(result[0].cust_points > req.body.total_cost) {

              //Building SQl query string to update the customer points in the database
              let pointsupdate = `UPDATE Customer_Data SET cust_points = cust_points - `+ req.body.total_cost +' WHERE cust_username = '+mysql.escape(req.body.cust_username);
              con.query(pointsupdate, function(err, result, fields) {
              })
              
              //Building SQL string to see the last conducted transaction and accordingly generate the new transaction ID
              let ledgercheck = 'SELECT COUNT(DISTINCT trans_id) AS last FROM Transaction_Data';
              con.query(ledgercheck, function(err, result, fields) {
                if(err) throw err;

                //Generating the transaction ID and assiging it to a variable
                let t_id = "T" + String(result[0].last+1);

                //Converting the incoming body object with details of the items in the transaction to an JSON string 
                var body = JSON.parse(JSON.stringify(req.body));

                //Defining arrays to store the item IDs, item costs and item quantities seperately (the same index of the arrays will contain details of the same item)
                let ids = []
                let costs = []
                let quantities = []

                //Looping over the JSON string key values and filling up the three arrays with appropriate values
                for(let i = 0; i<Math.floor((Object.keys(req.body).length-3)/3); i++) {
                  var key = 'item'+(i+1);
                  ids.push(body[key]);
                }
                for(let i = 0; i<Math.floor((Object.keys(req.body).length-3)/3); i++) {
                  var key = 'cost_of_item'+(i+1);
                  costs.push(body[key]);
                }
                for(let i = 0; i<Math.floor((Object.keys(req.body).length-3)/3); i++) {
                  var key = 'quantity'+(i+1);
                  quantities.push(body[key]);
                }

                //Looping over the arrays, building SQL query on every iteration to update the ledger data, one item of the transaction at a time
                for(let i = 0; i<ids.length; i++) {
                  let ledgerupdate = `INSERT INTO Transaction_Data VALUES('${t_id}', NOW(), (SELECT user_id FROM Customer_Data WHERE cust_username =  `+ mysql.escape(req.body.cust_username)+`), ${ids[i]},${quantities[i]}, ${costs[i]});`;
                  con.query(ledgerupdate, function(err, results, fields) {
                    if (err) throw err;
                  })
                }

                //Looping over the arrays, building SQL quuery on every iteration to update the inventory data, one item of the transaction at a time
                for(let i =0; i<ids.length; i++) {
                  let inventoryupdate = `UPDATE Inventory_Data SET item_quantity = item_quantity - ` + quantities[i] +` WHERE item_id = ${ids[i]} `;
                  con.query(inventoryupdate, function(err, result, fields) {
                    if(err) throw err;
                  }) 
                }
              })
            //Redirecting shopkeeper user to the ledger with the updated transaction data
            res.redirect('/ledger');
          }
          else {

            //Error message to be displayed when the user does not have enough points
            res.send('User does not have enough points to go ahead with the transaction! Please use cash or other means to pay');
          }
        })
        }
      }
      else {
        //Error message to be displayed when the username entered does not exist in the database
        res.send('User does not exist');
      }
    })
  }
})

//GET request route defined for the logging out which ends the current user session and redirects user back to the login page
app.get('/logout', function(req, res){
  res.redirect('/login');
  req.session.destroy();
});





























