import express from "express";
import { fillOrders, CheckBalance } from "./fillOrder.js";
import { users, balances, OrderBook } from "./memory.js";
import { v4 as uuid } from "uuid";
const app = express();
app.use(express.json());
import { promises as fs } from "fs";
app.post('/signup', async (req, res) => {
    const userid = uuid();
    const username = req.body.username;
    const password = req.body.password;
    const userExist = Array.from(users.values())
        .find(u => u.username === username);
    if (!userExist) {
        users.set(userid, { id: userid, username, password });
        balances.set(userid, {
            userId: userid,
            asset: {
                INR: {
                    free: 0,
                    locked: 0
                }
            }
        });
        await saveUserData(userid, username, password, 0, 0);
        return res.status(200).json({ message: "Signup Done" });
    }
    else {
        return res.json({ message: "Username already exist" });
    }
});
app.post('/signin', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const userExist = Array.from(users.values())
        .find(u => u.username === username && u.password === password);
    if (!userExist) {
        return res.status(404).json({ message: "User does not exists" });
    }
    else {
        return res.status(200).json({ userId: userExist.id, message: "Sign in Done" });
    }
});
app.post('/balance', async (req, res) => {
    const userId = req.body.userId;
    const amount = req.body.amount;
    const userBalance = balances.get(userId);
    if (!userBalance) {
        return res.status(404).json({ message: "UserId does not exist" });
    }
    if (!userBalance.asset.INR) {
        userBalance.asset.INR = {
            free: 0,
            locked: 0
        };
    }
    userBalance.asset.INR.free += amount;
    await saveBalanceData();
    return res.status(200).json({ message: "Balance Updated", balance: userBalance });
});
app.post('/order', (req, res) => {
    const side = req.body.side; // bid or ask
    const price = req.body.price;
    const quantity = req.body.quantity;
    const userId = req.body.userId;
    const ticker = req.body.ticker;
    //1 . Check if user exist
    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    //2. check if orderBook exists
    const book = OrderBook.get(ticker);
    if (!book) {
        return res.status(400).json({ message: "Order book not found" });
    }
    //3 . Check if balance Available
    const BalanceAvailable = CheckBalance(userId, price, quantity, side, ticker);
    if (!BalanceAvailable) {
        return res.json({ message: "Insufficient Balance" });
    }
    //4 . Send order to matching Engine
    const filledQuantity = fillOrders(side, price, quantity, userId, ticker);
    return res.status(200).json({ message: "Order passed",
        Order: {
            userId, ticker, side, price, quantity
        },
        filledQuantity,
        remainingQuantity: quantity - filledQuantity
    });
});
app.get('/depth', (req, res) => {
    const depth = {};
    for (let i = 0; i < bids.length; i++) {
        if (!depth[bids[i].price]) {
            depth[bids[i].price] = {
                quantity: bids[i].quantity,
                type: "bid"
            };
        }
        else {
            depth[bids[i].price].quantity += bids[i].quantity;
        }
    }
    for (let i = 0; i < asks.length; i++) {
        if (!depth[asks[i].price]) {
            depth[asks[i].price] = {
                quantity: asks[i].quantity,
                type: "ask"
            };
        }
        else {
            depth[asks[i].price].quantity += asks[i].quantity;
        }
    }
    res.json({
        depth
    });
});
app.get('/balance/:userId', (req, res) => {
    const userId = req.params.userId;
    const userExist = users.find(u => u.id === userId);
    if (!userExist) {
        return res.json({
            USD: 0,
            [TICKER]: 0
        });
    }
    else {
        return res.json({
            balances: userExist.balances
        });
    }
});
async function saveUserData(userId, username, password, freeBalance, lockedBalance) {
    let users = [];
    const filePath = 'log/user.json';
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        users = JSON.parse(data);
    }
    catch (error) {
        users = [];
    }
    const db = {
        userId, username, password, freeBalance, lockedBalance
    };
    users.push(db);
    await fs.writeFile(filePath, JSON.stringify(users, null, 2));
}
async function saveBalanceData() {
    const balanceArray = Array.from(balances.values());
    await fs.writeFile('log/balances.json', JSON.stringify(balanceArray, null, 2));
}
// async function saveOrderBook(){ 
//     const 
// }
app.listen(3000, () => {
    console.log(`Server is running on port -> ${3000}`);
});
