import { createClient } from "redis";
import { balances,OrderBook,STATUS,SIDE,TYPE } from "./memory.js";
import type { Ticker,OrderBookSnapshot } from "./memory.js";
import { v4 as uuid } from "uuid";
import { promises as fs } from "fs";

const client = await createClient({
    url:process.env.REDIS_URL!
}).on("error",(err)=>console.log("Error in connecting to createClient",err)).connect()

const subscriber = await createClient({
    url:process.env.REDIS_URL!
}).on("error",(err)=>console.log("subscriber queue have err",err)).connect();

while(1){
    const response = await client.brPop("incoming-order",1);
    if(!response){
        continue;
    }
    const parsedResponse = JSON.parse(response.element);
    const identifier:string = parsedResponse.identifier;

    const filledqty = await fillOrders(
        parsedResponse.side,
        parsedResponse.price,
        parsedResponse.quantity,
        parsedResponse.userId,
        parsedResponse.ticker
    );

    if (parsedResponse.type === "create_order") {
    }
    if (parsedResponse.type === "get_depth") {
        const depth = await getDepth(parsedResponse.ticker);
        subscriber.lPush("response-queue"+parsedResponse.queueId,JSON.stringify({depth,identifier}));
    }


    if (parsedResponse.type === "get_user_balance") {

    }
    

    if (parsedResponse.type === "get_order") {

    }

    if (parsedResponse.type === "cancel_order") {

    }
    subscriber.lPush("response-queue" + parsedResponse.queueId,JSON.stringify({filledqty,identifier}));
}

export async function fillOrders(side:"buy"|"sell",price:number,quantity:number,userId:string,ticker:Ticker){
    const book = OrderBook.get(ticker);
    if(!book){
        return 0;
    }
    const bids = book.bids;
    const asks = book.asks;

    let remainingQty = quantity;
    if(side === "buy"){
        BuyerlockBalance(userId,(price*quantity));
            // Buyer(bids) are matcing against Seller(asks)
        for(let i = 0;i < asks.length; i++){
            const ask = asks[i]!;
            if(ask.price === null){
                continue;
            }
                // seller price is higher ,cannot match
            if(ask.price > price){
                break;
            }
            const tradedQty = Math.min(remainingQty,ask.remainingQuantity);
                
            flipBalance(
                ask.userId,//seller
                userId, // Buyer
                tradedQty,
                ask.price,
                ticker
            );

            ask.remainingQuantity -= tradedQty;
            ask.filledQuantity += tradedQty;
            remainingQty -= tradedQty;

            if(ask.remainingQuantity === 0){
                ask.status = STATUS.FILLED;
                asks.splice(i,1);
                i--;
            }else{
                ask.status = STATUS.PARTIALLY_FILLED; 
            }
            if(remainingQty === 0){
                break;
            }
        }
            // remaining order become an open bid
        if(remainingQty > 0){
            bids.push({
                id : uuid(),
                userId,
                ticker,
                type:TYPE.LIMIT,
                side:SIDE.BUY,  
                price,
                quantity,
                filledQuantity: quantity - remainingQty,
                remainingQuantity : remainingQty,
                status:STATUS.OPEN,
                createdAt: new Date() 
            });
            bids.sort((a,b)=>b.price! - a.price!);
        }

    }
    else{
        //Seller is matching against Buyer
        SellerlockBalance(userId,ticker,quantity);
        for(let i=0;i<bids.length;i++){
                
            const bid = bids[i]!;
                // if buyer price low , cannot match
            if(bid.price! < price){
                break;
            }
            const tradedQty = Math.min(remainingQty,bid.remainingQuantity);
            flipBalance(
                userId, // seller
                bid.userId, // buyer 
                tradedQty,
                bid.price!,
                ticker
            );
            bid.remainingQuantity -= tradedQty;
            bid.filledQuantity += tradedQty;
            remainingQty -= tradedQty;
            
            if(bid.remainingQuantity === 0){
                bid.status = STATUS.FILLED; 
                bids.splice(i,1);
                i--;
            }else{
                bid.status = STATUS.PARTIALLY_FILLED; 
            }
            if(remainingQty === 0){
                break;
            }
        }
            // remaining order becomes an open ask
            if(remainingQty > 0){
                asks.push({
                    id: uuid(),
                    userId,
                    ticker,
                    type:TYPE.LIMIT ,
                    side:SIDE.SELL ,
                    price,
                    quantity,
                    remainingQuantity: remainingQty,
                    filledQuantity : quantity - remainingQty,
                    status:STATUS.OPEN,
                    createdAt: new Date(), 
                });
                asks.sort((a,b)=>a.price! - b.price!);
            }
        }
        return quantity - remainingQty;
        await saveOrderBook({
            ticker,
            bids,
            asks
        });

    }

export function CheckBalance(userId:string,price:number,quantity:number,side:"buy"|"sell",ticker:Ticker):boolean{
        const balance = balances.get(userId);
        if(!balance){
            return false;
        }
        if(side === "buy"){
            // buyer needs USD
            const INR = balance.asset.INR?.free ?? 0;
            return INR >= (price * quantity);    
        }
        if(side === "sell"){
            // seller needs asset
            const FindAsset = balance.asset[ticker]?.free ?? 0 ;
            return FindAsset >= quantity;
        }
        return false;
}

function flipBalance(sellerId:string,buyerId:string,quantity:number,price:number,ticker:Ticker){
    const sellerBalance = balances.get(sellerId);
    const buyerBalance = balances.get(buyerId);
    if(!sellerBalance || !buyerBalance){
        return;
    }
    const amount  = (quantity * price);
        // seller gives asset
    const sellerqty = sellerBalance.asset[ticker];
    if(!sellerqty){
        return;
    }
    sellerqty.locked -= quantity;

        //buyer receives asset   
    if(!buyerBalance.asset[ticker]){
        buyerBalance.asset[ticker] = {
            free: 0,
            locked:0
        };
    } 
    buyerBalance.asset[ticker].free += quantity;

    //buyer pays USD
    if(!buyerBalance.asset.INR){
        buyerBalance.asset.INR = {
            free : 0,
            locked : 0
        }
    };
    buyerBalance.asset.INR.locked -= amount;

    // seller receives USD
    if(!sellerBalance.asset.INR){
        sellerBalance.asset.INR ={
            free: 0 ,
            locked: 0
        }
    };
    sellerBalance.asset.INR.free += amount;
}

function BuyerlockBalance(userId:string,amount:number){
        const userExist = balances.get(userId);
        if(!userExist){
            return false;
        }
        const INR = userExist.asset.INR;
        if(!INR){
            return false;
        }
        INR.free -= amount;
        INR.locked += amount;
        return true;
}

function SellerlockBalance(userId:string,ticker:Ticker,quantity:number){
    const userExist = balances.get(userId);
    if(!userExist){
        return false;
    }
    const asset = userExist.asset[ticker];
    if(!asset){
        return false;
    }
    asset.free -= quantity;
    asset.locked += quantity;
    return true;
}

async function getDepth(ticker:Ticker){
    
    const depth:{
        [price:number]:{
            type:"bid"|"ask",
            quantity:number
        }
    } = {};
    const book = OrderBook.get(ticker);
    if(!book){
        return {};
    }
    const bids = book.bids;
    const asks = book.asks;
    for(let i=0;i<bids.length;i++){
        const bid = bids[i];
        if(!bid){
            continue;
        }
        if(bid.remainingQuantity === 0){
            continue;
        }
        if(!bid.price == null){
            continue;
        }
        if(!depth[bid.price!]){
            depth[bid.price!]= {
                quantity:bid.remainingQuantity,
                type:"bid"
            }
        }else{
            depth[bid.price].quantity += bid.remainingQuantity;
        }
    }
    for(let i=0;i<asks.length;i++){
        const ask = asks[i]!;
        if(!ask){
            return {};
        }
        if(ask.remainingQuantity === 0){
            continue;
        }
        if(!depth[ask.price!]){
            depth[ask.price!]={
                quantity: ask.remainingQuantity,
                type:"ask"
            }
        }else{
            depth[ask.price].quantity += ask.remainingQuantity;
        }
    }
    return depth;
}

async function saveOrderBook(order : OrderBookSnapshot){ 
    
    const filePath = '../engine/log/OrderBook.json';
    

    await fs.writeFile(filePath,JSON.stringify(OrderBook,null,2));
}
