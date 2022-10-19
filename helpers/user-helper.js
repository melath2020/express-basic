var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
const async = require('hbs/lib/async')
const { reject, promise } = require('bcrypt/promises')
const res = require('express/lib/response')
var objectId=require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('path')

var instance = new Razorpay({
  key_id: 'rzp_test_gohC5kurcXvhze',
  key_secret: 'yjlAGgNRKjRBqz9EK7VbGY2p',
});

module.exports={
    doSignup:(userData)=>{
        
        return new Promise(async(resolve,reject)=>{
            userData.password=await bcrypt.hash(userData.password,10)
               db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data)
               
            })
        
        })
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            
            let LoginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
            if(user){
                bcrypt.compare(userData.password,user.password).then((status)=>{
                    if(status){
                        console.log("Login Success")
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log("Login Failed")
                        resolve({status:false})
                        
                    }
                })
            }else{
                console.log("Login Failed")
                resolve({status:false})
            }
        })

    },
    addToCart:(proId,userId)=>{
        let proObj={
            item:objectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
               
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user:objectId(userId)},
                {
                  
                        $push:{products:proObj}
                  
                }
                ).then((responce)=>{
                    resolve()
                })
            }
            }else{
                let cartObj={
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((responce)=>{
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
                let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match:{user:objectId(userId)}
                    },
                    {
                        $unwind:'$products'
                    },{
                        $project:{
                            item:'$products.item',
                            quantity:'$products.quantity',

                        }
                    },{
                        $lookup:{
                            from:collection.PODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },{
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }
                    }
                    
                   
                ]).toArray()
                console.log(cartItems[0].products)
                resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)

        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart)},
            {
                $pull:{products:{item:objectId(details.product)}}
            }
            ).then((responce)=>{
                resolve({removeProduct:true})
            })
         }else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
                $inc:{'products.$.quantity':details.count}
            }
            ).then((responce)=>{
                resolve({status:true})
            })
         }
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },{
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity',

                    }
                },{
                    $lookup:{
                        from:collection.PODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },{
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },{
                    $project:{
                        quantity:{$toInt:"$quantity"},
                            price:{$toInt:"$product.price"},
                        }
                 },
                 {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$price']}}
                        
                    }
                }
                
               
            ]).toArray()
            if(total[0]){
                resolve(total[0].total)
            }else{
                resolve();
            }
         
         
    })
    },
    placeOrder:(order,products,total)=>{
            return new Promise((resolve,reject)=>{
                    console.log(order,products,total)
                    let status=order['paymentMethod']==='COD'?'placed':'pending'
                    let orderObj={
                        deliveryDetails:{
                            mobile:order.mobile,
                            address:order.address,
                            pincode:order.pincode
                        },
                        userId:objectId(order.userId),
                        paymentMethod:order['paymentMethod'],
                        products:products,
                        totalAmount:total,
                        status:status,
                        date:new Date()

                    }
                    db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((responce)=>{
                        db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})

                        resolve(responce.insertedId)
                    })
            })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:objectId(userId)}).toArray()
            console.log(orders);
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },{
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity',

                    }
                },{
                    $lookup:{
                        from:collection.PODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },{
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
               
            ]).toArray()
            // if(orderItems[0]){
            //     resolve(orderItems[0].orderItems)
            // }else{
            //     resolve();
            // }
         resolve(orderItems)
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{

            var options={
              amount: total*100,
              currency: "INR",
              receipt: ""+orderId,
            }
            instance.orders.create(options, function(err,order){
                console.log("New Order :",order);
                resolve(order)
            });




        })
    },verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'yjlAGgNRKjRBqz9EK7VbGY2p');

            hmac.update(details[ 'payment[razorpay_order_id]']+"|" +details['payment[razorpay_payment_id]']);
            hmac= hmac.digest('hex');
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }

        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }

}