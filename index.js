const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const { signIn, welcome, refresh, logout, getUserData } = require("./handlers")

const app = express();
app.use(cookieParser());

// Custom raw body handler
const rawBodyHandler = function (req, res, buf, encoding) {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}

/// CORS configuration
const corsOptions = {
    origin: 'https://todo-notes-app-roan.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// test code
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    res.on('finish', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response headers:', res.getHeaders());
    });
    next();
});


app.use(bodyParser.json({ verify: rawBodyHandler }));

app.use(express.static(path.join(__dirname, "../dist")));
console.log(path.join(__dirname, "../dist"));

app.get('/', (req, res) => {
    res.send('Hello World');
})

// test cors
app.get('/test-cors', cors(corsOptions), (req, res) => {
    res.json({ message: 'CORS is working' });
});

const PORT = process.env.PORT || 8080;

const user = "prabhat5172992@gmail.com";

app.post('/signup', (req, res) => {
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

app.put('/signup', (req, res) => {
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

app.post('/signin', signIn);
app.post('/welcome', welcome);
app.post('/refresh', refresh);
app.get('/logout', logout);
app.post('/userdata', getUserData);

app.post('/addNotes', (req, res) => {
    const { notes, email } = req.body;

    fs.readFile('user-notes.json', 'utf8', (err, data) => {
        const d = JSON.parse(data);
        if (!d[email]) {
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

app.get('/getNotes', (req, res) => {
    const { email } = req.body;

    fs.readFile('user-notes.json', 'utf8', (err, data) => {
        const notesData = JSON.parse(data)[email || user];
        res.status(200).send(notesData || []);
    });
});

app.delete('/deleteNotes', (req, res) => {
    const { id, email: usr } = req.body;

    fs.readFile('user-notes.json', 'utf8', (err, data) => {
        const d = JSON.parse(data);

        d[usr] = [...d[usr].filter(item => item.id !== id)];

        fs.writeFile('user-notes.json', JSON.stringify(d, null, 4), (err) => {
            if (err) throw err;
            else {
                res.status(200).send({ message: 'notes deleted!' })
            }
        });
    });
});

app.post('/addtodo', (req, res) => {
    const { todo, email } = req.body;

    fs.readFile('todos.json', 'utf8', (err, data) => {
        const d = JSON.parse(data);
        if (!d[email]) {
            d[email] = { "allTodos": [], "completedTodos": [] }
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

app.post('/getAllTodos', (req, res) => {
    const { email } = req.body;
    fs.readFile('todos.json', 'utf8', (err, data) => {
        const d = JSON.parse(data)[email];
        res.status(200).send(JSON.stringify(d) || { allTodos: [], completedTodos: [] });
    });
});

app.put('/updateTodos', (req, res) => {
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
