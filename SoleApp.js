// app.js

const express = require('express')
const { Sequelize, DataTypes, Op } = require('sequelize')

const app = express()
const PORT = process.env.PORT || 3000

// Connect to the SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
})

// Define the User model
const Contact = sequelize.define('Contact', {
  phoneNumber: {
     type: DataTypes.STRING,
     allowNull: true,
    validate: {
      isPhoneNumber(value) {
        // Simple regex for phone no.
        const phoneRegex = /^[0-9\+\-]+$/

        if (!phoneRegex.test(value)) {
          throw new Error('Invalid phone number')
        }
      },
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  linkedId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  linkPrecedence: {
    type: DataTypes.STRING,
    defaultValue: "primary"
  }
}
)

Contact.findTopLinkId = async ( partialContactObj ) => {
  const currentContact = await Contact.findOne(partialContactObj)
  if(!currentContact){
    return null
  }
  if(!currentContact.linkedId){
    return currentContact.id
  }
  return currentContact.linkedId
}

Contact.unionCreate = async(contactObj) => {
  
  const phoneLinkId = await Contact.findTopLinkId({ phoneNumber: contactObj.phoneNumber })
  const emailLinkId = await Contact.findTopLinkId({ email: contactObj.email })

  let selectedLinkId = null
  let selectedLinkPrecedence = "primary"
  let otherContacts 
  if(phoneLinkId == emailLinkId){
    return await Contact.findByPk(emailLinkId)    
  }else if(phoneLinkId !== null && emailLinkId !== null){
    const phoneContact = await Contact.findByPk(phoneLinkId)
    const emailContact = await Contact.findByPk(emailLinkId)

    // Set all contacts that match the linkedId of the newer object to the older object
    if(phoneContact.createdAt < emailContact.createdAt){
      selectedLinkId = phoneLinkId
      otherContacts = await Contact.findAll({ linkedId: emailLinkId })
    }else{
      selectedLinkId = emailLinkId
      otherContacts = await Contact.findAll({ linkedId: phoneLinkId })
    }
    await Promise.all(otherContacts.map(async (contact) => {
        contact.linkedId = selectedLinkId        
        await contact.save()
      })
    )
    selectedLinkPrecedence = "secondary"
  }else if (!phoneLinkId){
    selectedLinkId = emailLinkId
    selectedLinkPrecedence = "secondary"
  }else if (!emailLinkId){
    selectedLinkId  = phoneLinkId
    selectedLinkPrecedence = "secondary"
  }

  // Set the Final Contact Object
  contactObj.linkPrecedence = selectedLinkPrecedence
  contactObj.linkedId = selectedLinkId
  contactObj.save()

  return contactObj
}

// Sync the model with the database
sequelize.sync()
  .then(() => {
    console.log('Database and tables created successfully!')
  })
  .catch((error) => {
    console.error('Error syncing database:', error)
  })

// Middleware to parse JSON request bodies
app.use(express.json())

// Identity API 
app.post('/identity', async (req, res) => {
  try {
    const phoneNo = res.body.phoneNo
    const email = res.body.email

    // TODO: Validate PhoneNo. email

    // Create Logic
    if(!email && !phoneNo){
        return res.status(404).json({error: 'No contact details provided as neither email nor phoneNo. was provided.' }) 
    }else if (!email){
        const { phoneContact, _ } = await Contact.findOrCreate({ phoneNumber: phoneNo })
        return findUnionAndSendResponse(res, phoneContact)
    }else if(!phoneNo){
        const { emailContact, _ } = await Contact.findOrCreate({ email: email })
        return findUnionAndSendResponse(res, emailContact)
    }else{
        const emailContact = await Contact.findOne({email: email})
        const phoneContact = await Contact.findOne({phoneNumber: phoneNo})
        const { newContact, _ } = await Contact.findOrCreate({ phoneNumber: phoneNo, email: email })
        return findUnionAndSendResponse(res, newContact)
    }
  } catch (error) {
    console.error(req.body)
    console.error('Error creating contact:', error)
    res.status(500).json({ error: 'Failed to create contact' })
  }
})

const contactRouter = express.Router()

// Routes
contactRouter.get('', async (req, res) => {
  try {
    const contacts = await Contact.findAll()
    res.json(contacts)
  } catch (error) {
    console.error('Error retrieving contacts:', error)
    res.status(500).json({ error: 'Failed to retrieve contacts' })
  }
})

contactRouter.post('', async (req, res) => {
  try {
    const { phoneNumber, email, linkedId, linkedPrecedence } = req.body
    const contact = await Contact.create({ phoneNumber, email, linkedId, linkedPrecedence })
    res.status(201).json(contact)
  } catch (error) {
    console.error('Error retrieving contacts:', error)
    res.status(500).json({ error: 'Failed to retrieve contacts' })
  }
})

contactRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { phoneNumber, email, linkedId, linkPrecedence } = req.body
    const contact = await Contact.findByPk(id)
    
    if (!Contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }
    
    contact.phoneNumber = phoneNumber
    contact.email = email
    contact.linkedId = linkedId
    contact.linkPrecedence = linkPrecedence
    await contact.save()
    res.json(contact)

  } catch (error) {
    console.error('Error updating contact:', error)
    res.status(500).json({ error: 'Failed to update contact' })
  }
})

contactRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const contact = await Contact.findByPk(id)
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }
    await contact.destroy()
    res.sendStatus(204)

  } catch (error) {
    console.error('Error deleting contact:', error)
    res.status(500).json({ error: 'Failed to delete contact' })
  }
})

app.use('/contacts', contactRouter)

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
