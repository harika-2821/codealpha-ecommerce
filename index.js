const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


// ===============================
// SQLITE DATABASE
// ===============================

const db = new sqlite3.Database("./ecommerce.db", (err) => {
    if (err) {
        console.error("Database error:", err.message);
    } else {
        console.log("SQLite database connected.");
    }
});


// ===============================
// CREATE TABLES
// ===============================

db.serialize(() => {

    // ===========================
    // PRODUCTS TABLE
    // ===========================

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            price REAL NOT NULL
        )
    `);


    // ===========================
    // USERS TABLE
    // ===========================

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // ===========================
    // ORDERS TABLE
    // ===========================

    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // ===========================
    // ADD SAMPLE PRODUCTS
    // ===========================

    db.get(
        "SELECT COUNT(*) AS count FROM products",
        [],
        (err, row) => {

            if (err) {
                console.error(
                    "Product count error:",
                    err.message
                );
                return;
            }

            if (row.count === 0) {

                const products = [

                    [
                        "Shoes",
                        "Comfortable running shoes",
                        "Fashion",
                        2499
                    ],

                    [
                        "T-Shirt",
                        "Cotton casual T-Shirt",
                        "Fashion",
                        799
                    ],

                    [
                        "Smart Watch",
                        "Smart digital watch",
                        "Electronics",
                        2999
                    ],

                    [
                        "Backpack",
                        "Stylish travel backpack",
                        "Accessories",
                        1499
                    ]

                ];


                const stmt = db.prepare(`
                    INSERT INTO products
                    (name, description, category, price)
                    VALUES (?, ?, ?, ?)
                `);


                products.forEach(product => {
                    stmt.run(product);
                });


                stmt.finalize(() => {
                    console.log(
                        "Sample products added."
                    );
                });

            } else {

                console.log(
                    "Products table is already up to date."
                );

            }

        }
    );

});


// ==================================================
// GET ALL PRODUCTS
// ==================================================

app.get("/products", (req, res) => {

    db.all(
        `
        SELECT *
        FROM products
        ORDER BY id
        `,
        [],
        (err, rows) => {

            if (err) {

                console.error(
                    "Products error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to load products"
                });

            }

            res.json(rows);

        }
    );

});


// ==================================================
// GET SINGLE PRODUCT
// ==================================================

app.get("/products/:id", (req, res) => {

    const productId = req.params.id;

    db.get(
        `
        SELECT *
        FROM products
        WHERE id = ?
        `,
        [productId],
        (err, row) => {

            if (err) {

                console.error(
                    "Product details error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to load product"
                });

            }

            if (!row) {

                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });

            }

            res.json(row);

        }
    );

});


// ==================================================
// USER REGISTRATION
// ==================================================

app.post("/register", (req, res) => {

    const {
        name,
        email,
        password
    } = req.body;


    // Check required fields

    if (
        !name ||
        !email ||
        !password
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Name, email and password are required."

        });

    }


    // Check password length

    if (password.length < 4) {

        return res.status(400).json({

            success: false,

            message:
                "Password must be at least 4 characters."

        });

    }


    // Check existing user

    db.get(
        `
        SELECT id
        FROM users
        WHERE email = ?
        `,
        [email.trim().toLowerCase()],
        (err, row) => {

            if (err) {

                console.error(
                    "User check error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Database error."

                });

            }


            if (row) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email already registered."

                });

            }


            // Insert new user

            db.run(
                `
                INSERT INTO users
                (name, email, password)
                VALUES (?, ?, ?)
                `,
                [
                    name.trim(),
                    email.trim().toLowerCase(),
                    password
                ],
                function (err) {

                    if (err) {

                        console.error(
                            "Registration error:",
                            err.message
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Registration failed."

                        });

                    }


                    res.json({

                        success: true,

                        message:
                            "Registration successful!",

                        userId: this.lastID

                    });

                }
            );

        }
    );

});


// ==================================================
// USER LOGIN
// ==================================================

app.post("/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    if (
        !email ||
        !password
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Email and password are required."

        });

    }


    db.get(
        `
        SELECT
            id,
            name,
            email
        FROM users
        WHERE email = ?
        AND password = ?
        `,
        [
            email.trim().toLowerCase(),
            password
        ],
        (err, user) => {

            if (err) {

                console.error(
                    "Login error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Login failed."

                });

            }


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            res.json({

                success: true,

                message:
                    "Login successful!",

                user: user

            });

        }
    );

});


// ==================================================
// GET USER
// ==================================================

app.get("/users/:id", (req, res) => {

    const userId = req.params.id;


    db.get(
        `
        SELECT
            id,
            name,
            email,
            created_at
        FROM users
        WHERE id = ?
        `,
        [userId],
        (err, user) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load user."

                });

            }


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            res.json(user);

        }
    );

});


// ==================================================
// CREATE ORDER / CHECKOUT
// ==================================================

app.post("/orders", (req, res) => {

    const {
        userId,
        items
    } = req.body;


    // Check cart

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Cart is empty."

        });

    }


    // Calculate total

    let calculatedTotal = 0;


    items.forEach(item => {

        const price =
            Number(item.price) || 0;

        const quantity =
            Number(item.quantity) || 1;


        calculatedTotal +=
            price * quantity;

    });


    const finalTotal =
        calculatedTotal;


    // Convert items to JSON

    const itemsJson =
        JSON.stringify(items);


    // Create order

    db.run(
        `
        INSERT INTO orders
        (user_id, items, total)
        VALUES (?, ?, ?)
        `,
        [
            userId || null,
            itemsJson,
            finalTotal
        ],
        function (err) {

            if (err) {

                console.error(
                    "Order error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to create order."

                });

            }


            console.log(
                "Order created:",
                this.lastID
            );


            res.json({

                success: true,

                message:
                    "Checkout successful!",

                orderId:
                    this.lastID,

                total:
                    finalTotal

            });

        }
    );

});


// ==================================================
// GET ALL ORDERS
// ==================================================

app.get("/orders", (req, res) => {

    db.all(
        `
        SELECT
            orders.id,
            orders.user_id,
            orders.items,
            orders.total,
            orders.created_at,
            users.name AS user_name,
            users.email AS user_email
        FROM orders
        LEFT JOIN users
        ON orders.user_id = users.id
        ORDER BY orders.id DESC
        `,
        [],
        (err, rows) => {

            if (err) {

                console.error(
                    "Orders error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load orders."

                });

            }


            res.json(rows);

        }
    );

});


// ==================================================
// GET SINGLE ORDER
// ==================================================

app.get("/orders/:id", (req, res) => {

    const orderId =
        req.params.id;


    db.get(
        `
        SELECT
            orders.id,
            orders.user_id,
            orders.items,
            orders.total,
            orders.created_at,
            users.name AS user_name,
            users.email AS user_email
        FROM orders
        LEFT JOIN users
        ON orders.user_id = users.id
        WHERE orders.id = ?
        `,
        [orderId],
        (err, row) => {

            if (err) {

                console.error(
                    "Single order error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load order."

                });

            }


            if (!row) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."

                });

            }


            res.json(row);

        }
    );

});


// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});