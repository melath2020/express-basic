var db=require('../config/connection')
var collection=require('../config/collections')
const async = require('hbs/lib/async')
const { response } = require('../app')
var objectId=require('mongodb').ObjectId

module.exports={
    addProduct:(product,Callback)=>{
        console.log(product)
        db.get().collection('product').insertOne(product).then((data)=>{
            console.log(data)
            Callback(data.insertedId)
 
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PODUCT_COLLECTION).find().toArray()
            console.log(products)
            resolve(products)
        })

    },
    deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
           db.get().collection(collection.PODUCT_COLLECTION).deleteOne({_id:objectId(prodId)}).then((response)=>{
               console.log(response)
                resolve(response)
            })
        })
    },
    getProductDetails:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PODUCT_COLLECTION)
            .updateOne({_id:objectId(proId)},{
                $set:{
                    name:proDetails.name,
                    description:proDetails.description,
                    category:proDetails.category

                }
            }).then((response)=>{
                resolve()
            })
        })
    }
}


