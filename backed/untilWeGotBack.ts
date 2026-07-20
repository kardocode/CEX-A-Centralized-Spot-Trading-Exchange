import { createClient } from "redis";
import ('dotenv/config');
import { v4 as uuid } from "uuid";

export const queueId :string = uuid();

const pendingResolve: Record<
    string,
    (value:{filledqty:number}) =>void
> = {};

const subscriber = await createClient({
    url : process.env.REDIS_URL!
    })
    .on("error",(err)=>console.log("Error on file UntilWeGotBack Redis",err))
    .connect(); 

async function pollQueue(){
    console.log("subscribing to "+"reponse-queue"+queueId)
    const response = await subscriber.brPop("response-queue"+queueId,1);
    if(!response){
        console.log(response);
        pollQueue();
    }else{
        const parsedResponse = JSON.parse(response.element);
        if(parsedResponse && parsedResponse[parsedResponse.identifier]){
            parsedResponse[parsedResponse.identifier]({filledqty:parsedResponse.filledqty})
        }
        pollQueue();
    }
}
pollQueue();

export function UntilWeGotBack(identifier:string){
    return new Promise((resolve,reject)=>{
        pendingResolve[identifier] = resolve;
    })
}