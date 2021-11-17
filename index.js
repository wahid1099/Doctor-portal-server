const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");

const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());
//doctor-portal-firebase-adminsdk.json



// var serviceAccount = require('./doctor-portal-firebase-adminsdk.json');


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// console.log(serviceAccount);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.byzxg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req,res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const token=req.headers.authorization.split(' ')[1];
        try{
            const decodedUser=await admin.auth().verifyIdToken(token);
            req.decodedEmail=decodedUser.email;
        }
        catch{

        }
    }
    next();
}

async function run() {
    try {
        //making connnection with database
        await client.connect();
        console.log("database connected");
        //creating database and collections
        const database = client.db('doctors_portal');
        const appointmentsCollection = database.collection('appointments');
           const userCollection = database.collection('user');
      
     //getting user all appointments
        app.get('/appointments',verifyToken, async (req, res) => {
            const email = req.query.email;
            const date =req.query.date;
            const query = { email: email, date: date }
            const cursor = appointmentsCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })
    ///saving appointmentsof users from client site

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);
            console.log(result);
            res.json(result)
        });
        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await appointmentsCollection.findOne(query);
            res.json(result);
        })

            ///getting admins database
      app.get('/users/:email',async (req, res)=>{
    const email=req.params.email;
    const query={email: email};
    const user=await userCollection.findOne(query);
    let isAdmin =false;
    if(user?.role==='admin') {
        isAdmin = true;
    }
    res.json({admin: isAdmin});


    }) 


        //adding user data to databse
        app.post('/users',async (req, res) => {
            const user=req.body;
            const result = await userCollection.insertOne(user);
            res.json(result);
        })
         ///adding already exists users  data to database
        app.put('/users',async (req, res) => {
            const user = req.body;
            const filter={email: user.email};
            console.log(filter);
            const options = {upsert: true};
            const updateDoc={$set:user};
            const result=await userCollection.updateOne(filter,updateDoc,options);
            res.json(result);
        })

     ////////////////////////////////making admin and giving 
        app.put('/users/admin', verifyToken,async(req,res) => {
            const user=req.body;
            const requester=req.decodedEmail;
            if(requester){
                const requesterAccount=await userCollection.findOne({email:requester});
                if(requesterAccount.role=='admin'){
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.json(result);

                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })

    }
    finally {
      // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Doctors portal!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})

// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id');
// app.delete('/users/:id')
// users: get
// users: post

