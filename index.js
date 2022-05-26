const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000


//DB_USERNAME: metalDb
//Pass : 3EZ7c7SBvv3jBwAz
//middleware 

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ig4gb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('metalDb').collection('products');
        const ordersCollection = client.db('metalDb').collection('orders');
        const usersCollection = client.db('metalDb').collection('users');
        const paymentsCollection = client.db('metalDb').collection('payments');
        const reviewsCollection = client.db('metalDb').collection('reviews');
        console.log('db connected');

        //verify admin 
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            } else {
                return res.status(403).send({ message: 'Forbidden access' })
            }
        }

        //payment post api 
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        //update data for payment by id 
        app.patch('/orders/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    status: 'pending',
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentsCollection.insertOne(payment);
            const updatedOrders = await ordersCollection.updateOne(filter, updateDoc);
            res.send(updateDoc);
        });

        //update order status by id 
        app.put('/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: status
            }
            const updatedOrders = await ordersCollection.updateOne(filter, updateDoc);
            res.send(updatedOrders);
        });


        //add product api 
        app.post('/products', verifyToken, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        //get all products
        app.get('/products', async (req, res) => {
            const products = await productsCollection.find().toArray();
            res.send(products);
        });

        //get product by id 
        app.get('/products/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        });

        //delete product by id
        app.delete('/product/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            result = await productsCollection.deleteOne(query);
            res.send(result);
        });


        //get all orders 
        app.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
            const orders = await ordersCollection.find().toArray();
            res.send(orders);
        });

        //added order on database api 
        app.post('/orders', verifyToken, async (req, res) => {
            const orders = req.body;
            const result = await ordersCollection.insertOne(orders);
            res.send({ success: 'Order added' });
        });

        //get my orders by email 
        app.get('/order', verifyToken, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email;

            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const myOrders = await ordersCollection.find(query).toArray();
                return res.send(myOrders);
            } else {
                return res.status(403).send({ message: 'Forbidden access' })
            }

        });

        //delete order by their email from url api 
        app.delete('/orders/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { userEmail: email };
            const result = await ordersCollection.deleteOne(filter);
            res.send(result);
        });

        //delete order by their id from url api 
        app.delete('/allOrders/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        //get order by id 
        app.get('/orders/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });


        //added review in database  api 
        app.post('/reviews', verifyToken, async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        });

        //get all reviews  api 
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find().toArray();
            res.send(reviews);
        });


        //add or update user email for login , register, google sign in
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };

            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        });



        //get all users api 
        app.get('/users', verifyToken, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });


        //get user by email 
        app.get('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        });

        //update user profile
        app.put('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };

            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send({ result });
        });



        //make admin from users
        app.put('/user/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        //find user by email and check Admin is or not 
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin });
        });




    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Welcome to Metal Parts World')
})

app.listen(port, () => {
    console.log(`Metal Parts World listening on port ${port}`)
})