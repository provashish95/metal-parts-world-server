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

client.connect(err => {
    const collection = client.db("test").collection("devices");
    console.log('db connected');
});

app.get('/', (req, res) => {
    res.send('Welcome to Metal Parts World')
})

app.listen(port, () => {
    console.log(`Metal Parts World listening on port ${port}`)
})