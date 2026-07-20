import express from "express";
import 'dotenv/config';
import type { Request,Response } from "express";
import { fillOrders,CheckBalance } from "../engine/fillOrder.js"
import { users,balances, OrderBook, SIDE, orders } from "../engine/memory.js";
import type {Ticker , UserDetail } from "../engine/memory.js"
import { v4 as uuid } from "uuid";
const app = express();
app.use(express.json());
import { promises as fs } from "fs"
import  { createClient } from "redis";
import { UntilWeGotBack,queueId } from "./untilWeGotBack.js";

const client = await createClient({
    url : process.env.REDIS_URL!})
    .on("error",(err)=>console.log(`Error in connecting to createClient`,err))
    .connect();

type Side = "buy" | "sell";

app.post('/signup',async (req,res)=>{
    const userid: string = uuid();
    const username : string = req.body.username;
    const password : string = req.body.password;
    const userExist = Array.from(users.values())
        .find(u => u.username === username)
    if(!userExist){
        users.set(userid,{id:userid,username,password})
        balances.set(userid,{
            userId: userid,
            asset:{
                INR:{
                    free:0,
                    locked:0
                }
            }
        });
    const UserDetail = users.get(userid);
    if(!UserDetail){
        return res.status(404).json({message:"User not found"});
    }
    const BalanceDetail = balances.get(userid);
    
    if(!BalanceDetail?.asset.INR){
        return 0;
    }
        await saveUserData({
        userId : userid,
        username : UserDetail.username,
        password : UserDetail.password,
        freeBalance : BalanceDetail.asset.INR.free,
        lockedBalance : BalanceDetail.asset.INR.locked
    });
        return res.status(200).json({message:"Signup Done"});
    }else{
        return res.json({message:"Username already exist"})
    }
})

app.post('/signin', (req,res)=>{
    const username:string = req.body.username;
    const password:string = req.body.password;
    const userExist = Array.from(users.values())
        .find(u => u.username === username && u.password === password);
    if(!userExist){
        return res.status(404).json({message:"User does not exists"});
    }else{
        return res.status(200).json({userId:userExist.id,message:"Sign in Done"})
    }
})

app.post('/balance',async (req,res)=>{
    const userId = req.body.userId;
    const amount:number = req.body.amount;
        
    const userBalance = balances.get(userId);   
    if(!userBalance){
        return res.status(404).json({message:"UserId does not exist"})
    }
    if(!userBalance.asset.INR){
        userBalance.asset.INR = {
            free: 0,
            locked : 0
        }
    }
    userBalance.asset.INR.free += amount;
    await saveBalanceData();

    return res.status(200).json({message:"Balance Updated",balance:userBalance});

})

app.post('/order',async (req:Request,res:Response)=>{
    const side: Side = req.body.side; // buy or sell
    const price: number = req.body.price;
    const quantity: number = req.body.quantity;
    const userId: string = req.body.userId;
    const ticker : Ticker = req.body.ticker;
    const identifier:string = uuid();

    
    //1 . Check if user exist
    const user = users.get(userId);
    if(!user){
        return res.status(404).json({message:"User not found"})
    }
    //2. check if orderBook exists
    const book = OrderBook.get(ticker);
    if(!book){
        return res.status(400).json({message:"Order book not found"});
    }
    //3 . Check if balance Available
    const BalanceAvailable:boolean = CheckBalance(userId,price,quantity,side,ticker);
    if(!BalanceAvailable){
        return res.json({message:"Insufficient Balance"})
    }
    // starting the other queue to get faster data 
    const returnedData = await UntilWeGotBack(identifier);
    
    //5 . Send order to matching Engine by a queue
    await client.lPush("incoming-order",JSON.stringify({
        side,price,quantity,userId,ticker,identifier,queueId
    }));
    const UserDetail = users.get(userId);
    if(!UserDetail){
        return res.status(404).json({message:"User not found"});
    }
    const BalanceDetail = balances.get(userId);
    
    if(!BalanceDetail?.asset.INR){
        return 0;
    }
    
    if(!returnedData){
        res.send("SEARCHING");
    }
    res.json({message:"order placed",filledqty:returnedData.filledqty});
    
})

app.get('/depth',(req:Request,res:Response)=>{
    const depth:{
        [price:string]:{
            type:"bid"|"ask",
            quantity:number,
        }
    } = {};
    for(let i=0;i<bids.length;i++){
        if(!depth[bids[i].price]){
            depth[bids[i].price] = {
                quantity:bids[i].quantity,
                type:"bid"
            };
        }else{
            depth[bids[i].price].quantity += bids[i].quantity;
        }
    }
    for(let i=0;i<asks.length;i++){
        if(!depth[asks[i].price]){
            depth[asks[i].price] = {
                quantity: asks[i].quantity,
                type: "ask"
            } 
        }else{
            depth[asks[i].price].quantity += asks[i].quantity;
        }
    }
    res.json({
        depth
    })
})
app.get('/orders',(req,res)=>{
    
})
app.get('/orders/open',(req,res)=>{
    
})
app.get('fills',(req,res)=>{
    
})

app.get('/balance/:userId',(req,res)=>{
    const userId = req.params.userId;
    const  userExist = users.find(u=>u.id === userId);
    if(!userExist){
        return res.json({
            USD : 0,
            [TICKER]:0
        })
    }else{
        return res.json({
            balances: userExist.balances
        })
    }

})

async function saveUserData(data:UserDetail){
    let users = [];
    const filePath = 'log/user.json';
    try{
        const data  = await fs.readFile(filePath,'utf-8');
        users = JSON.parse(data);
    }catch(error){
        users = [];
    }

    users.push(data);
    await fs.writeFile(filePath,JSON.stringify(users,null,2));
}
async function saveBalanceData() {
    const balanceArray = Array.from(balances.values());

    await fs.writeFile(
        'log/balances.json',
        JSON.stringify(balanceArray,null,2)
    )
}


app.listen(3000,()=>{
    console.log(`Server is running on port -> ${3000}`)
});