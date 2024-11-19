const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs'); // For handling file-based storage, you can replace this with a DB if needed.

app.use(compression({
    level: 9,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
    console.log(req.method, req.url);
    next();
});
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

// Serve the dashboard HTML page
app.post('/player/login/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/html/dashboard.html');
});

// Handle login and validation of GrowID
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`
    );
});

// Register a new GrowID account
app.post('/player/growid/register', (req, res) => {
    const growId = req.body.growId;
    const email = req.body.email;
    const password = req.body.password;

    if (!growId || !email || !password) {
        return res.status(400).json({
            status: "error",
            message: "All fields are required.",
        });
    }

    // Check if the GrowID already exists (simple in-memory check, can be replaced with a DB query)
    const users = JSON.parse(fs.readFileSync('users.json', 'utf8') || '[]');
    const userExists = users.some(user => user.growId === growId);

    if (userExists) {
        return res.status(400).json({
            status: "error",
            message: "GrowID already exists.",
        });
    }

    // Register new user
    const newUser = { growId, email, password };

    users.push(newUser);
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));

    res.status(200).json({
        status: "success",
        message: "Account successfully registered.",
        growId: newUser.growId,
    });
});

// Handle closing of the validation window
app.post('/player/validate/close', function (req, res) {
    res.send('<script>window.close();</script>');
});

// Home route
app.get('/', function (req, res) {
    res.send('Hello World!');
});

// Start the server on port 5000
app.listen(5000, function () {
    console.log('Listening on port 5000');
});
