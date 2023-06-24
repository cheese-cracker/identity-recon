// Helper Functions
export const syncDB = async (sequelize) => {
  try {
    await sequelize.sync()
    console.log('Database and tables created successfully!');
  } catch (error) {
    console.error('Error syncing database:', error)
  }
}
export const startServer = async (app, port) => {
  try {
    await app.listen(port)
    console.log(`[Info] Server Started Successfully! Listening on Port: ${port}`)
  } catch (error) {
    console.log(error)
    throw error
  }
}
