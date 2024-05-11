const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const serverless = require('serverless-http');
const { signIn, welcome, refresh, logout } = require("../handlers.js");
const router = express.Router();

const app = express();
app.use(cookieParser());

var rawBodyHandler = function (req, res, buf, encoding) {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}

app.use(cors({ allowedHeaders: 'Content-Type, Cache-Control' }));
app.options('*', cors());  // enable pre-flight

app.use(bodyParser.json({ verify: rawBodyHandler }));

app.use(express.static(path.join(__dirname, "../dist")));
console.log(path.join(__dirname, "../dist"));

router.get('/', (req, res) => {
    res.send('Hello World');
})

const PORT = process.env.PORT || 8080;

const user = "prabhat5172992@gmail.com";

router.post('/signup', (req, res) => {
    const { username, password, email } = req.body;

    if (username && password && /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[A-Za-z]+$/.test(email)) {
        fs.readFile('userlist.json', 'utf8', (err, data) => {
            const d = JSON.parse(data);
            if (!d.find(item => item.email === email)) {
                d.push({
                    username,
                    email,
                    password
                });

                fs.writeFile('userlist.json', JSON.stringify(d, null, 4), (err) => {
                    if (err) throw err;
                    else {
                        return res.send(signIn(req, res, d));
                    }
                });
            } else {
                res.status(400).send({ "message": "User already exists!" });
            }
        });
        // signIn(req, res);
    } else {
        res.status(400).send({ "message": "Data is not correct!" })
    }
});

router.put('/signup', (req, res) => {
    const { email, password } = req.body;

    fs.readFile('userlist.json', 'utf8', (err, data) => {
        const d = JSON.parse(data);
        if (!d.find(item => item.email === email)) {
            res.status(400).send({ "message": "User doesn't exit!" })
        } else {
            const changedData = d.map(item => {
                if (item.email === email) {
                    item.password = password;
                }
                return item;
            });

            fs.writeFile('userlist.json', JSON.stringify(changedData, null, 4), (err) => {
                if (err) throw err;
                res.status(200).send({ message: "Update successful!" });
            });
        }
    });
});

router.post('/signin', signIn);
router.get('/welcome', welcome);
router.post('/refresh', refresh);
router.get('/logout', logout);

router.post('/addNotes', (req, res) => {
    const { notes, email } = req.body;

    fs.readFile('user-notes.json', 'utf8', (err, data) => {
        const d = JSON.parse(data);
        if(!d[email]) {
            d[email] = []
        }

        d[email].push({
            id: uuidv4(),
            notes
        });

        fs.writeFile('user-notes.json', JSON.stringify(d, null, 4), (err) => {
            if (err) throw err;
        });
    });

    res.status(200).send({ 'message': 'Successfully added notes!' });
});

router.get('/getNotes/:email', (req, res) => {
    fs.readFile('user-notes.json', 'utf8', (err, data) => {
        const notesData = JSON.parse(data)[req.params.email || user];
        res.status(200).send(notesData || []);
    });
});

router.delete('/deleteNotes/:email', (req, res) => {
    const { id } = req.body;

    fs.readFile('user-notes.json', 'utf8', (err, data) => {
        const d = JSON.parse(data);
        const usr = req.params.email || user;

        d[usr] = [...d[usr].filter(item => item.id !== id)];

        fs.writeFile('user-notes.json', JSON.stringify(d, null, 4), (err) => {
            if (err) throw err;
            else {
                res.status(200).send({ message: 'notes deleted!' })
            }
        });
    });
});

router.post('/addtodo', (req, res) => {
    const { todo, email } = req.body;

    fs.readFile('todos.json', 'utf8', (err, data) => {
        const d = JSON.parse(data);
        if(!d[email]) {
            d[email] = {"allTodos": [], "completedTodos": []}
        }

        d[email].allTodos.push({
            id: uuidv4(),
            todo
        });

        fs.writeFile('todos.json', JSON.stringify(d, null, 4), (err) => {
            if (err) throw err;
        });
    });

    res.status(200).send({ 'message': 'Successfully added todo!' });
});

router.get('/getAllTodos/:email', (req, res) => {
    fs.readFile('todos.json', 'utf8', (err, data) => {
        const d = JSON.parse(data)[req.params.email];
        res.status(200).send(JSON.stringify(d) || { allTodos: [], completedTodos: [] });
    });
});

router.put('/updateTodos', (req, res) => {
    const { id, type, email } = req.body;
    const d = { "allTodos": [], "completedTodos": [] }

    fs.readFile('todos.json', 'utf8', (err, data) => {
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
        fs.writeFile('todos.json', JSON.stringify(todoData, null, 4), (err) => {
            if (err) throw err;
        });
    });

    res.status(200).send({ 'message': 'Successfully updated' })
});

app.listen(PORT, () => {
    console.log('App is running on port: ', PORT);
});

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);

// end point: https://todo-server-mamta.netlify.app/.netlify/functions/api