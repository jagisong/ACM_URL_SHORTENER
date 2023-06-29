require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const shortId = require('shortid');
const bodyParser = require('body-parser');
const ejs = require('ejs');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const passport = require('passport');
var flash = require('connect-flash');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const passportLocalMongoose = require('passport-local-mongoose');




const app = express();



main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/shortUrl');

    // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 60000 }
}))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());




const shortUrlSchema = new mongoose.Schema({
    fullurl: {
        type: String,
        required: true
    },
    short: {
        type: String,
        required: true,
        default: shortId.generate
    },
    note: {
        type: String,
    }
})

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema);
const User = mongoose.model('User', userSchema);


passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET_KEY,
    callbackURL: "http://localhost:3000/auth/google/url-shortener"
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            // console.log(profile);
            // Find or create user in your database
            let user = await User.findOne({
                googleId: profile.id
            });
            if (!user) {
                // Create new user in database
                const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
                const newUser = new User({
                    username: profile.displayName,
                    googleId: profile.id
                });
                user = await newUser.save();
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
    // async function (accessToken, refreshToken, profile, cb) {
    //     await User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //         return cb(err, user);
    //     });
    // }
));


app.get('/', async (req, res) => {
    res.render('home1');
})

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/search', async (req, res) => {
    let temp2 = req.flash('success2')
    let temp3 = req.flash('success4')
    let temp4 = req.flash('success6')
    // console.log(temp3);
    // const url3 = await ShortUrl.find({ fullurl: temp3 });
    // console.log(temp2);
    res.render('search', { success: temp2, shortUrls: temp3, success4: temp4 });
})

app.get('/login', async (req, res) => {
    res.render('login');
})

app.get('/auth/google/url-shortener',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/home');
    });

app.get('/register', async (req, res) => {
    res.render('register');
});

app.get('/home', async (req, res) => {
    res.render('home');
});

app.get('/index', async (req, res) => {
    if (req.isAuthenticated()) {
        let temp1 = req.flash('success1')
        let temp2 = req.flash('success3')
        let temp3 = req.flash('success5')
        let temp4 = req.flash('success6')
        const url2 = await ShortUrl.find({ fullurl: temp2 });

        // console.log(url2);
        res.render('index', { success: temp1, shortUrls: url2, success1: temp3, success2: temp4 });
    } else {
        res.redirect('/login');
    }
})

app.get("/logout", async (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.post('/register', async (req, res) => {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register');
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home")
            });
        }
    })

    // bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         // password: md5(req.body.password)
    //         password: hash
    //     });

    //     let temp = await newUser.save();
    //     if(!temp){
    //         console.log(temp);
    //     }else{
    //         res.render('secrets');
    //     }
    // });
});

app.post("/login", async (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home")
            });
        }
    });

    // const username = req.body.username;
    // // const password = md5(req.body.password);
    // const password = req.body.password;

    // let temp1 = await User.findOne({ email: username});
    // if(!temp1){
    //     console.log(temp1);
    // }else{
    //     bcrypt.compare(password, temp1.password, function(err, result) {
    //         if(result === true){
    //             res.render('secrets');
    //         }
    //     });
    // }
});



app.post('/index', async (req, res) => {
    const FullUrl = req.body.fullUrl;
    const Note = req.body.note;
    const url = await ShortUrl.find({ fullurl: FullUrl });
    const note = await ShortUrl.find({ note: Note });

    // console.log(note);
    if (note.length > 0) {
        req.flash('success6', "Note already exists")
        return res.redirect('/index');
    }

    if (url.length == 0) {
        const shortUrl = new ShortUrl({
            fullurl: FullUrl,
            note: Note
        })

        let temp = shortUrl.save();
        if (temp) {
            req.flash('success1', "Short URL created successfully")
            req.flash('success3', FullUrl)
        }

        res.redirect('/index');
    }
    else {
        // console.log("note already exists1212")
        req.flash('success2', "Short URL already exists, you can search short url here")
        res.redirect('/search')

    }
})

app.post('/search', async (req, res) => {
    const FullUrl1 = req.body.fullUrl1;
    let Note1 = req.body.note1;
    let url1;
    // console.log(FullUrl1,Note1);
    if (FullUrl1 == "" && Note1 == "") {
        req.flash('success6', "Fill out one of the section below to search");
        return res.redirect('/search');
    }
    if (FullUrl1 != "") {
        url1 = await ShortUrl.find({ fullurl: FullUrl1 });
    }
    else if (Note1 != "") {
        url1 = await ShortUrl.find({ note: Note1 });
    }

    // console.log(url1)

    if (url1.length > 0) {
        req.flash('success4', url1);
        res.redirect('/search');
    }
    else {
        req.flash('success5', "Short URL not exists, you can create short url here")
        res.redirect('/index')
    }

})

app.get('/:shortUrl', async (req, res) => {
    const temp = await ShortUrl.findOne({ short: req.params.shortUrl });
    if (temp == null) return res.sendStatus(404);

    temp.save();
    res.redirect(temp.fullurl);
})

const port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log(`listening on port ${port}`);
});