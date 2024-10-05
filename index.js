const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { signIn, welcome, refresh, logout, getUserData } = require('./handlers');

const app = express();
app.use(cookieParser());

// Custom raw body handler
const rawBodyHandler = function (req, res, buf, encoding) {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}

app.use(bodyParser.json({ verify: rawBodyHandler }));

// Add headers before the routes are defined
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'https://todo-notes-app-roan.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

const PORT = process.env.PORT || 8080;
const user = "prabhat5172992@gmail.com";

app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    if (username && password && /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[A-Za-z]+$/.test(email)) {
        try {
            const dataPath = path.join(__dirname, 'userlist.json');
            const data = await fs.readFile(dataPath, 'utf8');
            const userList = JSON.parse(data);

            if (!userList.find(item => item.email === email)) {
                userList.push({ username, email, password });
                await fs.writeFile(dataPath, JSON.stringify(userList, null, 4));
                return res.send(signIn(req, res, userList));
            } else {
                res.status(400).send({ message: "User already exists!" });
            }
        } catch (err) {
            res.status(500).send({ message: "Internal server error" });
        }
    } else {
        res.status(400).send({ message: "Data is not correct!" });
    }
});

app.put('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        const dataPath = path.join(__dirname, 'userlist.json');
        const data = await fs.readFile(dataPath, 'utf8');
        const userList = JSON.parse(data);

        if (!userList.find(item => item.email === email)) {
            res.status(400).send({ message: "User doesn't exist!" });
        } else {
            const updatedList = userList.map(item => {
                if (item.email === email) {
                    item.password = password;
                }
                return item;
            });

            await fs.writeFile(dataPath, JSON.stringify(updatedList, null, 4));
            res.status(200).send({ message: "Update successful!" });
        }
    } catch (err) {
        res.status(500).send({ message: "Internal server error" });
    }
});

app.post('/signin', signIn);
app.post('/welcome', welcome);
app.post('/refresh', refresh);
app.get('/logout', logout);
app.post('/userdata', getUserData);

app.post('/addNotes', async (req, res) => {
    const { notes, email } = req.body;

    try {
        const dataPath = path.join(__dirname, 'user-notes.json');
        const data = await fs.readFile(dataPath, 'utf8');
        const notesData = JSON.parse(data);

        if (!notesData[email]) {
            notesData[email] = [];
        }

        notesData[email].push({ id: uuidv4(), notes });
        await fs.writeFile(dataPath, JSON.stringify(notesData, null, 4));
        res.status(200).send({ message: 'Successfully added notes!' });
    } catch (err) {
        res.status(500).send({ message: "Internal server error" });
    }
});

app.post('/getNotes', async (req, res) => {
    const { email } = req.body;

    try {
        const dataPath = path.join(__dirname, 'user-notes.json');
        const data = await fs.readFile(dataPath, 'utf8');
        const notesData = JSON.parse(data)[email || user];
        res.status(200).send(notesData || []);
    } catch (err) {
        res.status(500).send({ error: `Unable to read notes.json file` });
    }
});

app.delete('/deleteNotes', async (req, res) => {
    const { id, email } = req.body;

    try {
        const dataPath = path.join(__dirname, 'user-notes.json');
        const data = await fs.readFile(dataPath, 'utf8');
        const notesData = JSON.parse(data);

        notesData[email] = notesData[email].filter(item => item.id !== id);
        await fs.writeFile(dataPath, JSON.stringify(notesData, null, 4));
        res.status(200).send({ message: 'Notes deleted!' });
    } catch (err) {
        res.status(500).send({ message: "Internal server error" });
    }
});

app.post('/addtodo', async (req, res) => {
    const { todo, email } = req.body;

    try {
        const dataPath = path.join(__dirname, 'todos.json');
        const data = await fs.readFile(dataPath, 'utf8');
        const d = JSON.parse(data);
        if (!d[email]) {
            d[email] = { "allTodos": [], "completedTodos": [] }
        }

        d[email].allTodos.push({
            id: uuidv4(),
            todo
        });
        await fs.writeFile(dataPath, JSON.stringify(d, null, 4));
        res.status(200).send({ 'message': 'Successfully added todo!' });
    } catch (err) {
        res.status(500).send({ error: `Unable to read notes.json file` });
    }
});

app.post('/getAllTodos', async (req, res) => {
    const { email } = req.body;
    try {
        const dataPath = path.join(__dirname, 'todos.json');
        const data = await fs.readFile(dataPath, 'utf8');
        
        res.status(200).send(JSON.stringify(d) || { allTodos: [], completedTodos: [] });
    } catch (err) {
        res.status(500).send({ message: "Unable to read notes.json file: ",err });
    }
});

app.put('/updateTodos', async (req, res) => {
    const { id, type, email } = req.body;
    const d = { "allTodos": [], "completedTodos": [] }

    try {
        const dataPath = path.join(__dirname, 'todos.json');
        const data = await fs.readFile(dataPath, 'utf8');

        const todoData = JSON.parse(data);
        let userTodo = todoData[email];
        d.completedTodos = [...userTodo.completedTodos];

        if (type === "all") {
            userTodo.allTodos.forEach(element => {
                if (element.id === id) {
                    d.completedTodos.push(element);
                } else {
                    d.allTodos.push(element);
                }
            });
        }

        if (type === "completed") {
            d.allTodos = [...userTodo.allTodos]
            d.completedTodos = userTodo.completedTodos.filter(item => item.id !== id);
        }

        todoData[email] = { ...d }

        await fs.writeFile(dataPath, JSON.stringify(todoData, null, 4));
        
        res.status(200).send({ 'message': 'Successfully updated' })
    } catch (err) {
        res.status(500).send({ message: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log('App is running on port:', PORT);
});
