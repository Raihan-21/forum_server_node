const express = require('express')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express();
const {MongoClient, ObjectId} = require('mongodb')
const client = new MongoClient("mongodb://localhost:27017")
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
        app.get('/api/home', async (req, res) => {
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
            const maxAge = 3 * 24 * 60 * 60
            try {
                const data = await db.collection('users').findOne({email: req.body.email})
                const token = jwt.sign({email: req.body.email}, 'discussion forum credentials', {
                    expiresIn: maxAge
                } )
                if(data.password == req.body.password){
                    res.cookie('token', token, {httpOnly: true, maxAge: maxAge * 1000 })
                    res.json({result: data, token})
                }
                else{
                    throw 'Wrong password'
                }

            } catch (error) {
                res.json({error: error})
            }

        })
        app.post('/api/signup', async (req, res) => {
            try {
                const data = await db.collection('users').insertOne(req.body)
                /api//api/ console.log(req.body)
                res.json({result: data})
            } catch (error) {
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
        // await updateData()
    }
    catch(err){
        console.log(err)
    }
    finally{
        // await client.close()
    }
}
connect()



// const getPost = async () => {
//     const select = await db.collection('post').find({}).toArray()
//     return select
// }
// const showPost = async (id) => {
//     const select = await db.collection('post').findOne({_id: ObjectId(id)})
//     return select
// }
// const updateData = async () => {
//     const select = await db.collection('post').updateOne({_id: ObjectId("615673dff844f07e191abaae")}, {$set: {user_id: 1}})
//     return select
// }