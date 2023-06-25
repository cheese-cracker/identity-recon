import express from 'express'
import cors from 'cors'
import sequelize from './database.js'
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


// Wrapper functions
async function syncDB(sequelize) {
  try {
    await sequelize.sync()
    console.log('Database and tables created successfully!')
  } catch (error) {
    console.error('Error syncing database:', error)
  }
}

async function startServer(app, port) {
  try {
    await app.listen(port)
    console.log(`[Info] Server Started Successfully! Listening on Port: ${port}`)
  } catch (error) {
    console.log(error)
    throw error
  }
}

// Sync the model with the database
syncDB(sequelize)

// Start Server
startServer(app, PORT)
