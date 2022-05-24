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
        console.log('db connected');


        //get all products
        app.get('/products', async (req, res) => {
            const products = await productsCollection.find().toArray();
            res.send(products);
        });
        //get product by id 
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        });

        //update product quantity api 
        app.put('/updateQuantity/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    quantity: data.updateQuantity
                },
            };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        });

        //added order on database api 
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const result = await ordersCollection.insertOne(orders);
            res.send({ success: 'Order added' });
            /*             const tokenInfo = req.headers.authorization;
                        const [email, accessToken] = tokenInfo?.split(" ");
                        const decoded = verifyToken(accessToken);
                        //const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
                        if (email === decoded.email) {
                            const result = await ordersCollection.insertOne(newBooks);
                            res.send({ success: 'Upload successfully' })
                        } else {
                            res.send({ success: 'Unauthorized Access' })
                        } */

        });


        //for google login use here put method
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