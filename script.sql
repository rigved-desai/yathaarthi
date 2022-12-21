CREATE DATABASE IF NOT EXISTS shopdatabase;

CREATE TABLE IF NOT EXISTS Customer_Data ( 

    cust_name VARCHAR(45), 
    cust_username VARCHAR(50) NOT NULL UNIQUE, 
    cust_email VARCHAR(50) NOT NULL UNIQUE, 
    cust_pw VARCHAR(200) NOT NULL UNIQUE, 
    cust_number INT UNIQUE, 
    cust_points INT DEFAULT 0, 
    cust_amount_spent INT DEFAULT 0, 
    user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY 

); 

CREATE TABLE IF NOT EXISTS Inventory_Data ( 

    item_id INT AUTO_INCREMENT PRIMARY KEY NOT NULL, 
    item_name VARCHAR(50) NOT NULL UNIQUE, 
    item_cost INT NOT NULL, 
    item_product INT NOT NULL 

); 

CREATE TABLE IF NOT EXISTS Transaction_Data ( 

    trans_id VARCHAR(10) NOT NULL, 
    trans_date DATETIME NOT NULL, 
    trans_cust_id INT NOT NULL, 
    trans_item_id INT NOT NULL, 
    trans_item_quantity INT NOT NULL, 
    trans_cost INT NOT NULL

);  