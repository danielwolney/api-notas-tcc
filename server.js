//PACKAGES
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var morgan = require("morgan");
var mongoose = require("mongoose");
var expressValidator = require("express-validator");

var jwt = require("jsonwebtoken");
var config = require("./config");
var User = require("./app/models/user.js");
var Note = require("./app/models/note.js");

var crypto = require("crypto");

var port = process.env.PORT || 8080;

//CONFIG
mongoose.connect(config.database);
app.set('secret', config.secret);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(morgan('dev'));

app.get("/", function (req, res) {
    res.send("Hello! The Server API is running at http://localhost:" + port + "/api/v1");
});

app.post("/setup", function (req, res) {
    User.findOne({ email: 'danielwolney@gmail.com' }, function (error, user) {
        if (!user) {
            user = new User({ email: 'danielwolney@gmail.com', password: crypto.createHash("md5").update("admin123").digest('hex') });
            user.save(function (error) {
                if (error) throw error;
                console.log("User 'danielwolney@gmail.com' created");
                res.status(201).json({ success: true, message: "Server was setup" });
            });
        } else {
            res.status(403).json({ success: false });
        }
    });
});

var apiRoutes = express.Router();

apiRoutes.post("/login", function (req, res) {
    //TODO validar parametros
    User.findOne({ email: req.body.email, password: crypto.createHash("md5").update(req.body.password).digest("hex") },
        function (error, user) {
            if (error) {
                res.status(500).json({ success: false, error: error });
            } else if (user) {
                var token = jwt.sign({ id: user._id }, config.secret, { expiresIn: "2 days" });
                res.json({ success: true, message: "Login successful", token: token });
            } else {
                res.status(401).json({ success: false, message: "User or password invalid" });
            }
        });
});

//colocar o middleware de autenticação depois da rota "/login" para não protegê-la  
apiRoutes.use(function (req, res, next) {
    var token = req.body.token || req.query.token || req.headers["x-access-token"];

    if (token) {
        jwt.verify(token, config.secret, function (error, decoded) {
            if (error) {
                return res.status(403).json({ success: false, message: 'Failed to authenticate token' });
            }
            User.findOne({ _id: req.userID }, function (error, user) {
                if (error) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                }
                req.decoded = decoded;
                req.user = user;
                req.userID = decoded.id;
                next();
            });
        });
    } else {
        return res.status(403).json({ success: false, message: 'No token provided' });
    }
});

/*apiRoutes.get("/users", function (req, res) {
    User.find({}, function (error, users) {
        if (error) {
            res.status(500).json(error);
            return;
        }
        res.json(users);
    });
});*/

apiRoutes.get("/notes", function (req, res) {
    Note.find({ creator: req.userID }, function (error, notes) {
        if (error) {
            res.status(500).json(error);
            return;
        }
        res.json(notes);
    });
});

apiRoutes.post("/notes", function (req, res) {
    var postNotesList = req.body;
    if (!postNotesList || !Array.isArray(postNotesList) || postNotesList.length < 1) {
        res.status(400).json({ success: false, message: "Lista de notas invalidas" });
        return;
    } else {
        var savedNotes = [];
        var noteModels = [];
        postNotesList.forEach(function (postNote) {
            if (postNote.localID && postNote.text && postNote.date) {
                var note = new Note({ text: postNote.text, date: new Date(postNote.date), creator: req.userID });
                noteModels.push({ localID: postNote.localID, note: note });
            }
        });
        var saveFirst = function () {
            if (noteModels.length > 0) {
                noteModels[0].note.save(function (error) {
                    if (!error) {
                        savedNotes.push({ localID: noteModels[0].localID, resourceID: noteModels[0].note._id });
                    }
                    noteModels.shift();
                    saveFirst();
                });
            } else {
                res.json({ success: true, savedNotes: savedNotes });
            }
        }
        saveFirst();
    }
});

apiRoutes.delete("/notes", function (req, res) {
    var postNotesList = req.body;
    if (!postNotesList || !Array.isArray(postNotesList) || postNotesList.length < 1) {
        res.status(400).json({ success: false, message: "Lista de notas invalidas" });
        return;
    } else {
        var deletedNotes = [];
        var deleteFirst = function () {
            if (postNotesList.length > 0) {
                Note.findByIdAndRemove(postNotesList[0],function (error, deletedNote) {
                    if (error) {
                        console.log(error);
                    }
                    if (deletedNote) {
                        deletedNotes.push(postNotesList[0]);
                    }

                    postNotesList.shift();
                    deleteFirst();
                });
            } else {
                res.json({ success: true, deletedNotes: deletedNotes });
            }
        }
        deleteFirst();
    }
});

apiRoutes.put("/notes", function (req, res) {
    var postNotesList = req.body;
    if (!postNotesList || !Array.isArray(postNotesList) || postNotesList.length < 1) {
        res.status(400).json({ success: false, message: "Lista de notas invalidas" });
        return;
    } else {
        var updatedNotes = [];
        var updateFirst = function () {
            if (postNotesList.length > 0) {
                if (postNotesList[0].resourceID && postNotesList[0].text && postNotesList[0].date) {
                    Note.findByIdAndUpdate(postNotesList[0].resourceID,{text: postNotesList[0].text,date: new Date(postNotesList[0].date)},function (error, updatedNote) {
                        if (error) {
                            console.log(error);
                        }
                        if (updatedNote) {
                            updatedNotes.push(postNotesList[0].resourceID);
                        }
                        postNotesList.shift();
                        updateFirst();
                    });
                } else {
                    postNotesList.shift();
                    updateFirst();
                }
            } else {
                res.json({ success: true, updatedNotes: updatedNotes });
            }
        }
        updateFirst();
    }
});

app.use("/api/v1", apiRoutes);

apiRoutes.get("/", function (req, res) {
    res.json({ message: "Wellcome to KeppNotes API" });
});

app.listen(port);
console.log("Server running at port " + port);
