import { balances, OrderBook, STATUS, SIDE, TYPE } from "./memory.js";
import { v4 as uuid } from "uuid";
export function fillOrders(side, price, quantity, userId, ticker) {
    const book = OrderBook.get(ticker);
    if (!book) {
        return 0;
    }
    const bids = book.bids;
    const asks = book.asks;
    let remainingQty = quantity;
    if (side === "buy") {
        BuyerlockBalance(userId, (price * quantity));
        // Buyer(bids) are matcing against Seller(asks)
        for (let i = 0; i < asks.length; i++) {
            const ask = asks[i];
            if (ask.price === null) {
                continue;
            }
            // seller price is higher ,cannot match
            if (ask.price > price) {
                break;
            }
            const tradedQty = Math.min(remainingQty, ask.remainingQuantity);
            flipBalance(ask.userId, //seller
            userId, // Buyer
            tradedQty, ask.price, ticker);
            ask.remainingQuantity -= tradedQty;
            ask.filledQuantity += tradedQty;
            remainingQty -= tradedQty;
            if (ask.remainingQuantity === 0) {
                ask.status = STATUS.FILLED;
                asks.splice(i, 1);
                i--;
            }
            else {
                ask.status = STATUS.PARTIALLY_FILLED;
            }
            if (remainingQty === 0) {
                break;
            }
        }
        // remaining order become an open bid
        if (remainingQty > 0) {
            bids.push({
                id: uuid(),
                userId,
                ticker,
                type: TYPE.LIMIT,
                side: SIDE.BUY,
                price,
                quantity,
                filledQuantity: quantity - remainingQty,
                remainingQuantity: remainingQty,
                status: STATUS.OPEN,
                createdAt: new Date()
            });
            bids.sort((a, b) => b.price - a.price);
        }
    }
    else {
        //Seller is matching against Buyer
        SellerlockBalance(userId, ticker, quantity);
        for (let i = 0; i < bids.length; i++) {
            const bid = bids[i];
            // if buyer price low , cannot match
            if (bid.price < price) {
                break;
            }
            const tradedQty = Math.min(remainingQty, bid.remainingQuantity);
            flipBalance(userId, // seller
            bid.userId, // buyer 
            tradedQty, bid.price, ticker);
            bid.remainingQuantity -= tradedQty;
            bid.filledQuantity += tradedQty;
            remainingQty -= tradedQty;
            if (bid.remainingQuantity === 0) {
                bid.status = STATUS.FILLED;
                bids.splice(i, 1);
                i--;
            }
            else {
                bid.status = STATUS.PARTIALLY_FILLED;
            }
            if (remainingQty === 0) {
                break;
            }
        }
        // remaining order becomes an open ask
        if (remainingQty > 0) {
            asks.push({
                id: uuid(),
                userId,
                ticker,
                type: TYPE.LIMIT,
                side: SIDE.SELL,
                price,
                quantity,
                remainingQuantity: remainingQty,
                filledQuantity: quantity - remainingQty,
                status: STATUS.OPEN,
                createdAt: new Date(),
            });
            asks.sort((a, b) => a.price - b.price);
        }
    }
    return quantity - remainingQty;
}
export function CheckBalance(userId, price, quantity, side, ticker) {
    const balance = balances.get(userId);
    if (!balance) {
        return false;
    }
    if (side === "buy") {
        // buyer needs USD
        const INR = balance.asset.INR?.free ?? 0;
        return INR >= (price * quantity);
    }
    if (side === "sell") {
        // seller needs asset
        const FindAsset = balance.asset[ticker]?.free ?? 0;
        return FindAsset >= quantity;
    }
    return false;
}
function flipBalance(sellerId, buyerId, quantity, price, ticker) {
    const sellerBalance = balances.get(sellerId);
    const buyerBalance = balances.get(buyerId);
    if (!sellerBalance || !buyerBalance) {
        return;
    }
    const amount = (quantity * price);
    // seller gives asset
    const sellerqty = sellerBalance.asset[ticker];
    if (!sellerqty) {
        return;
    }
    sellerqty.locked -= quantity;
    //buyer receives asset   
    if (!buyerBalance.asset[ticker]) {
        buyerBalance.asset[ticker] = {
            free: 0,
            locked: 0
        };
    }
    buyerBalance.asset[ticker].free += quantity;
    //buyer pays USD
    if (!buyerBalance.asset.INR) {
        buyerBalance.asset.INR = {
            free: 0,
            locked: 0
        };
    }
    ;
    buyerBalance.asset.INR.locked -= amount;
    // seller receives USD
    if (!sellerBalance.asset.INR) {
        sellerBalance.asset.INR = {
            free: 0,
            locked: 0
        };
    }
    ;
    sellerBalance.asset.INR.free += amount;
}
function BuyerlockBalance(userId, amount) {
    const userExist = balances.get(userId);
    if (!userExist) {
        return false;
    }
    const INR = userExist.asset.INR;
    if (!INR) {
        return false;
    }
    INR.free -= amount;
    INR.locked += amount;
    return true;
}
function SellerlockBalance(userId, ticker, quantity) {
    const userExist = balances.get(userId);
    if (!userExist) {
        return false;
    }
    const asset = userExist.asset[ticker];
    if (!asset) {
        return false;
    }
    asset.free -= quantity;
    asset.locked += quantity;
    return true;
}
