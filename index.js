const express = require('express')
require('dotenv').config()
const bodyParser = require('body-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const  cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express()
const port = 5000



app.use(cors(
  {
    origin:['http://localhost:5173'],
    credentials: true
  }
))



app.use(bodyParser.json())
app.use(cookieParser())


const verifiedToken = async (req, res, next) =>{
  const token = req?.cookies?.token
  if(!token){
    return res.status(401).send({massage:'unauthorize user'})
  }



  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    // err
    if(err){
      console.log(err)
      return res.status(401).send({massage:'unauthorize user'})
    }
    console.log(decoded)
    req.user = decoded
  

    next()
  });
  
}









const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.elvxgab.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




async function run() {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection
    const productsCollection = client.db("foodiRestaurant").collection("products")
    const orderCollection = client.db("foodiRestaurant").collection("order")
    const conformOrderCollection = client.db("foodiRestaurant").collection("conformOrder")




    // authentication related api 


try {
   app.post('/jwt', async(req,res) =>{
    const user = req.body;
    // console.log(req.cookies.token)
    console.log(user)

    const token = jwt.sign(user, process.env.SECRET, { expiresIn: '1h' });

    res.cookie('token', token,{
      httpOnly:true,
      secure:false,
    }).send({success:true})
  })
} catch (error) {
  console.error(error)
}



    // get api start

    try {
      app.get('/topSellFoods', async(req, res) =>{
        const options = {
          projection:{description:0,madeBy:0,count:0 },
        };

        const result = await productsCollection.find({},options).limit(6).sort({count:-1}).toArray()
        res.send(result)
    })
      
    } catch (error) {
      console.error(error)
    }

 

    try {
      app.get('/allFoods', async(req,res) =>{

        
        let searchText = req.query.search;
        const pageNumber = Number(req.query.pages);
        const pageSize = Number(req.query.size);
        let searchValue = {}



        if(searchText !== 'undefined' && searchText !== '' ){
          searchValue = { name: searchText}
        }


        const result = await productsCollection.find(searchValue).skip((pageNumber*pageSize)-pageSize).limit(pageSize).toArray()
        const result2 = await productsCollection.estimatedDocumentCount()
        console.log(searchValue)
        res.send({result,result2})
        
      })
      
    } catch (error) {
      console.error(error)
    }


    try {
      app.get('/conformOrder', async(req,res)=>{

        const emails = req.query.email

        const query = { email: emails }
        console.log(emails)

        const result = await conformOrderCollection.find(query).toArray()
        res.send(result)
        
      })
      
    } catch (error) {
      console.error(error)
    }




    // get api end 

    try {
      app.get('/details', async(req, res) =>{

        const id = req.query.id
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.findOne(query)
        res.send(result)
      })
  
    } catch (error) {
      console.error(error)
    }

    try {
      app.post('/order', async(req, res) =>{
        const foodId = req.query.id
        const foodData = req.body

        const findData = await orderCollection.findOne({id:foodId,email:foodData.email})

        if(findData == undefined){
          const result = await orderCollection.insertOne(foodData)
          return res.send(result)
        }
        else{
          return res.send(findData)
        }
        
      })
      
    } catch (error) {
      console.error(error)
    }


    try {
      app.post('/conformOrder', async(req,res)=>{
        const {name,imageUrl,category,totalPrice,madeBy,totalCount,foodOrigin,date,email,buyerName,status} = req.body

        const conformOrderFood = {
          name,
          imageUrl,
          category,
          totalPrice,
          madeBy,
          totalCount,
          foodOrigin,
          date,
          email,
          buyerName,
          status
        }
        const result = await conformOrderCollection.insertOne(conformOrderFood)
        res.send(result)
        
      })
      
    } catch (error) {
      console.error(error)
    }


    try {
      app.get('/ordersFoods', verifiedToken, async(req,res) =>{
        console.log('quary emaill',req.user.email)
        const emails = req?.query?.email
        console.log(emails, req.user.email)
        console.log(emails)
        if(req?.user?.email !== emails){
          return res.status(403).send({massage:'Forbidden access'})


        }
        const query = { email:emails }
        const result = await orderCollection.find(query).toArray()
        res.send(result)
      })
      
    } catch (error) {
      console.error(error)
    }



    // post api end 


  app.put('/allFoods', async(req, res) =>{
    const id = req.query.id
    const { totalQuantity, grandTotalCount,status,totalCount,totalPrice} = req.body;

    const filter = { _id: new ObjectId(id) }
    const filter2 = { id:id }

    const updateFood = {
      $set:{
        quantity:totalQuantity,
        count:grandTotalCount,
      }};

    const updateFood2 = {
      $set:{
        quantity:totalQuantity,
        count:grandTotalCount,
        purchaseCount:totalCount,
        price:totalPrice,
        status:status
      }};
  try {     
    const result = await productsCollection.updateOne(filter, updateFood);
    const result2 = await orderCollection.updateOne(filter2, updateFood2);
    res.send({result,result2})

  } catch (error) {
    console.error('Error during update:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
    
  })
  



  try {
    app.delete('/ordersFoods', async(req,res)=>{
      const ids = req.query.id
      const query = { _id: new ObjectId(ids) }

      const result = await orderCollection.deleteOne(query)
      res.send(result)

    })
  } catch (error) {
    console.error(error)
  }



  try {
    app.delete('/conformOrder', async(req,res)=>{

      const id = req.query.id

      const query = { _id: new ObjectId(id) }

      const result = await conformOrderCollection.deleteOne(query)
      res.send(result)
      
    })
    
  } catch (error) {
    console.error(error)
  }




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);















app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})