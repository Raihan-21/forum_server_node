const express = require('express')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const app = express();
const {MongoClient, ObjectId} = require('mongodb')
const client = new MongoClient("mongodb+srv://raihan:iKeEZyWrdCzvu8UY@cluster0.dyuhm.mongodb.net/discussion_forum?retryWrites=true&w=majority")
const db = client.db('discussion_forum')

app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser())
const connect = async () => {
    try{
        await client.connect()
        app.listen(5000, function(){
            console.log('app is running')
        })
        app.get('/api/discussions', async (req, res) => {
            let posts = await db.collection('posts').find({}).toArray()
            posts = posts.map(async post => {
                            const answer = await db.collection('answers').find({post_id: post._id}).count()
                            const user = await db.collection('users').findOne({email: post.user_email})
                            post.answers = answer
                            post.fullname = user.fullname
                            return post
                        })
            const data = await Promise.all(posts)
            res.json({result: data})
        })
        app.get('/api/categories', async (req, res) => {
            const data = await db.collection('categories').find({}).toArray()
            res.json({result: data})
        })
        app.post('/api/categories', async (req, res) => {
            const data = await db.collection('categories').find({}).toArray()
            res.json({result: data})
        })

        app.post('/api/create', async (req, res) => {
            const {user_email, title, category, content} = req.body
            const data = await db.collection('posts').insertOne({user_email, title, category, content, like: 0})
            res.json({result: data})
        })
        app.post('/api/login', async (req, res) => {
            const { email, password} = req.body
            const maxAge = 3 * 24 * 60 * 60
            try {
                const data = await db.collection('users').findOne({email: req.body.email})
                if(data){
                    const auth = await bcrypt.compare(password, data.password)
                    if(auth){
                        const token = jwt.sign({email: req.body.email}, 'discussion forum credentials', {
                            expiresIn: maxAge
                        } )
                        res.cookie('token', token, {httpOnly: true, maxAge: maxAge * 1000 })
                        res.json({result: data})
                    }
                    else{
                        throw 'Wrong password'
                    }
                }
                else{
                    throw 'No user found'
                }
            } catch (error) {
                res.json({error: error})
            }

        })
        app.post('/api/signup', async (req, res) => {
            const {email, fullname, password} = req.body
            try {
                const salt = await bcrypt.genSalt()
                const hashed = await bcrypt.hash(password, salt)
                const data = await db.collection('users').insertOne({email, fullname, password: hashed})
                res.json({result: data})
            } catch (error) {
                console.log(error)
                res.json({error: error})
            }

        })
        app.get('/api/discussions/:id', async (req, res) =>{
            let post = await db.collection('posts').findOne({_id: ObjectId(req.params.id)})
            const user = await db.collection('users').findOne({email: post.user_email})
            let answers = await db.collection('answers').find({post_id: ObjectId(req.params.id)}).toArray()
            answers = answers.map(async answer => {
                const user = await db.collection('users').findOne({email: answer.user_email})
                answer.user_fullname = user.fullname
                return answer
            })
            post.user_fullname = user.fullname
            answers = await Promise.all(answers)
            res.json({post,user, answers })
        })
        app.post('/api/answer', async (req, res) => {
            const {user_email, content, post_id} = req.body
            try {
                const data = await db.collection('answers').insertOne({user_email, post_id: ObjectId(post_id), content, like: 0})
                res.json({result: data})
            } catch (error) {
                res.json({error: error})
            }
            // console.log(post_id)
        })
        app.get('/api/auth', (req, res) => {
            const cookies = req.cookies.token
            if(cookies){
                jwt.verify(cookies, 'discussion forum credentials', async (err, decoded) => {
                    if(err){
                        console.log(err)
                        res.json({err})
                    }
                    else{
                        const user = await db.collection('users').findOne({email: decoded.email})
                        res.json({result: user})
                    }
                })
            }
            else{
                res.json({err: 'err'})
            }

        })
        app.get('/api/logout', (req, res) => {
            const cookie = req.cookies.token
            res.cookie('token', '', { maxAge: 1})
            res.json({result: 'logged out'})
        })
    }
    catch(err){
        console.log(err)
    }
    finally{
        // await client.close()
    }
}
connect()
