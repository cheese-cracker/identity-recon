import { Sequelize } from 'sequelize'

// Connect to the SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
});

export default sequelize