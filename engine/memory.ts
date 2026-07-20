type Currency = "INR";

export type Ticker =
  | "GOOGLE"
  | "CIPLA"
  | "DIXON"
  | "ONGC"
  | "M&M"
  | "CANBNK"
  | "SBIN";

type Asset = Currency | Ticker;
    interface AssetBalance {
        free : number;
        locked : number
    }

    interface User{
        id: string;
        username: string;
        password:string;
    }

    interface Balance {
        userId : string;
        asset:Partial<Record<Asset,AssetBalance>>;
    }
    
export enum TYPE {
    MARKET ,
    LIMIT
}
export enum SIDE {
    BUY,
    SELL
}
export enum STATUS {
    OPEN,
    PARTIALLY_FILLED,
    FILLED,
    CANCELLED        
}
    enum TransactionStatus{
        PENDING,
        COMPLETED,
        FAILED,
        CANCELLED
    }
    enum TransactionType {
        DEPOSIT,
        WITHDRAWAL
    }
    
    interface Transaction {
        id: string;
        userId : string;
        asset : Asset;
        amount : number;
        type : TransactionType;
        status : TransactionStatus;
        createdAt : Date;
        completedAt? : Date; 
        cancelledAt? : Date;
    }

    interface Order{
        id: string;
        userId : string;
        ticker: Ticker;
        type : TYPE;
        price : number | null;
        quantity : number;
        remainingQuantity : number;
        filledQuantity : number;
        side : SIDE;
        status:STATUS;
        createdAt : Date;
    }

    interface Fill {
        id: string;
        buyerId : string;
        sellerId : string;
        buyOrderId : string;
        sellOrderId : string;
        ticker :Ticker;
        quantity:number;
        price:number;
        createdAt : Date;
    }
    export interface UserDetail {
        userId : string;
        username:string;
        password : string;
        freeBalance : number;
        lockedBalance : number;
    } 
export type OrderBookSnapshot = {
    [ticker in Ticker]?: {
        bids: Order[];
        asks: Order[];
    }
};


export const users = new Map<string,User>();
export const balances = new Map<string,Balance>();
export const fills : Fill[] = [];
export const orders : Order[] = []; 
export const OrderBook = new Map<Ticker,{
    bids:Order[];
    asks:Order[];
}>();
export const transactions : Transaction[] = [];
export const deposits : Transaction[] = []; 
export const withdrawals : Transaction[] = []; 
