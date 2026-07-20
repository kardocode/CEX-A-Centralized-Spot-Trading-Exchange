export var TYPE;
(function (TYPE) {
    TYPE[TYPE["MARKET"] = 0] = "MARKET";
    TYPE[TYPE["LIMIT"] = 1] = "LIMIT";
})(TYPE || (TYPE = {}));
export var SIDE;
(function (SIDE) {
    SIDE[SIDE["BUY"] = 0] = "BUY";
    SIDE[SIDE["SELL"] = 1] = "SELL";
})(SIDE || (SIDE = {}));
export var STATUS;
(function (STATUS) {
    STATUS[STATUS["OPEN"] = 0] = "OPEN";
    STATUS[STATUS["PARTIALLY_FILLED"] = 1] = "PARTIALLY_FILLED";
    STATUS[STATUS["FILLED"] = 2] = "FILLED";
    STATUS[STATUS["CANCELLED"] = 3] = "CANCELLED";
})(STATUS || (STATUS = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus[TransactionStatus["PENDING"] = 0] = "PENDING";
    TransactionStatus[TransactionStatus["COMPLETED"] = 1] = "COMPLETED";
    TransactionStatus[TransactionStatus["FAILED"] = 2] = "FAILED";
    TransactionStatus[TransactionStatus["CANCELLED"] = 3] = "CANCELLED";
})(TransactionStatus || (TransactionStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType[TransactionType["DEPOSIT"] = 0] = "DEPOSIT";
    TransactionType[TransactionType["WITHDRAWAL"] = 1] = "WITHDRAWAL";
})(TransactionType || (TransactionType = {}));
export const users = new Map();
export const balances = new Map();
export const fills = [];
export const orders = [];
export const OrderBook = new Map();
export const transactions = [];
export const deposits = [];
export const withdrawals = [];
