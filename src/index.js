import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const participantSchema = joi.object({
    name: joi.string().min(1).required()
})

const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().required()
})

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let time = dayjs().locale("pt-br").format("HH:mm:ss");

try {
    await mongoClient.connect();
    db = mongoClient.db("batePapoUol");
} catch (err) {
    console.log(err);
}

app.post("/participants", async (req, res) => {
    const { name } = req.body;

    const participant = {
        name
    }

    const validation = participantSchema.validate(participant, { abortEarly: false });

    if (validation.error) {
        const erros = validation.error.details.map((detail) => detail.message);
        res.status(422).send(erros);
        return;
    }

    const uSer = {
        name,
        lastStatus: Date.now(),
        message:{
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time
        }
    }

    const users = await db.collection("participants").find().toArray();
    const isUserExists = users.find((user) => user.name === name);

    if (isUserExists) {
        res.status(409).send({ error: "Usuário já existe" });
        return;
    }

    try {
        await db.collection("participants").insert(uSer);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(422);
    }

});

app.get("/participants", async (req, res) => {
    try {
        const users = await db.collection("participants").find().toArray();
        res.send(users);
    } catch (err) {
        console.log(err);
    }
});

app.post("/messages", async (req, res) => {
    const {to, text, type} = req.body;
    const {user} = req.headers;

    const message = {
        to,
        text,
        type
    }

    const validation = messageSchema.validate(message, { abortEarly: false });

    if (validation.error) {
        const erros = validation.error.details.map((detail) => detail.message);
        res.status(422).send(erros);
        return;
    }

    // const typeString = type.toString();
    // console.log(typeString);
    
    // if(typeString === "message" || typeString === "private_message"){
    //     res.status(409).send({ error: "Tipo de mensagem não permitida" });
    //     return;
    // }

    const sender = await db.collection("participants").find().toArray();
    const isUserExists = sender.find((u) => u.name === user);
    
    if(!isUserExists){
        res.status(409).send({ error: "Usuário não existe" });
        return;
    }

    const messageVerificated = {
        to,
        from: user, 
        text,
        type, 
        time
    }

    try {
        await db.collection("messages").insert(messageVerificated);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(422);
    }

});

app.get("/messages", async (req, res) => {
    try {
        const mes = await db.collection("messages").find().toArray();
        res.send(mes);
    } catch (err) {
        console.log(err);
    }
});

app.post("/status", async (req, res) => {
    const {user} = req.headers;

    const checkStatus = await db.collection("participants").find().toArray();
    const isUserExists = checkStatus.find((u) => u.name === user);

    if(!isUserExists){
        res.sendStatus(404);
        return;
    }

    const userStatus = {
        name: user,
        lastStatus: Date.now()
    }

    try {
        await db.collection("status").insert(userStatus);
        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        res.sendStatus(422);
    }

});

app.listen(5000, () => console.log("Server runing in port: 5000"));