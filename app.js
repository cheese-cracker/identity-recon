import express from 'express'
import cors from 'cors'
import sequelize from './database.js'
import { syncDB, startServer } from './utils/helpers.js'
import identityRouter from './routes/identity.js'
import contactRouter from './routes/contact.js'

const PORT = process.env.PORT || 8080

const app = new express()

// Add CORS
const corsOptions = {
  origin: '*',
  methods: ''
}

// Middleware Initializations
app.use(cors(corsOptions))
app.use(express.json())

// Add Routes
app.use('/contacts', contactRouter)
app.use('/identity', identityRouter)

// Sync the model with the database
syncDB(sequelize)

// Start Server
startServer(app, PORT)
