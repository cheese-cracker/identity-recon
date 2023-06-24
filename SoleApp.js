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
      isNumeric: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
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
    defaultValue: "primary",
    validate: {
      isIn: [["primary", "secondary"]],
    },
  }
}
)

Contact.findTopLinkId = async ( whereClause ) => {
  const currentContact = await Contact.findOne({ where: whereClause })
  if(!currentContact){
    return null
  }
  if(!currentContact.linkedId){
    return currentContact.id
  }
  return currentContact.linkedId
}

Contact.unionCreate = async(contactObj) => {
  let phoneLinkId, emailLinkId, otherLinkId
  let selectedLinkId = null
  let selectedLinkPrecedence = "primary"
  try{
    phoneLinkId = await Contact.findTopLinkId({ phoneNumber: contactObj.phoneNumber })
    emailLinkId = await Contact.findTopLinkId({ email: contactObj.email })
  } catch(error){
    console.error("Failed to retreive LinkIds: ", error)
  }
  console.error(phoneLinkId, emailLinkId)
  try{
    if(phoneLinkId !== null && phoneLinkId == emailLinkId){
      return await Contact.findByPk(phoneLinkId)
    }else if(phoneLinkId !== null && emailLinkId !== null){
      selectedLinkPrecedence = "secondary"
      const phoneContact = await Contact.findByPk(phoneLinkId)
      const emailContact = await Contact.findByPk(emailLinkId)

      // Set all contacts that match the linkedId of the newer object to the older object
      console.error(await Contact.findAll())
      if(phoneContact.createdAt < emailContact.createdAt){
        selectedLinkId = phoneLinkId
        otherLinkId    = emailLinkId
      }else{
        selectedLinkId = emailLinkId
        otherLinkId    = phoneLinkId
      }
      const otherContacts = await Contact.findAll({
        where: {
          [Op.or] : [ { linkedId: otherLinkId }, { id: otherLinkId } ]
        }
      })
      console.error(otherContacts)
      await Promise.all(otherContacts.map(async (contact) => {
          contact.linkPrecedence = selectedLinkPrecedence
          contact.linkedId = selectedLinkId
          await contact.save()
        })
      )
    }else if (phoneLinkId !== null){
      selectedLinkId = phoneLinkId
      selectedLinkPrecedence = "secondary"
    }else if (emailLinkId !== null){
      selectedLinkId  = emailLinkId
      selectedLinkPrecedence = "secondary"
    }

    // Set the Final Contact Object
    contactObj.linkPrecedence = selectedLinkPrecedence
    contactObj.linkedId = selectedLinkId
    console.error(contactObj)
    const newContact = Contact.create(contactObj)
    return newContact

  } catch (error) {
    console.error("Failed at union creation: ", error)
  }
}

// GroupBy LinkedId and provide the results in specified format (MapReduce-like)
Contact.groupByLinkedId = async (contactObj) => {
  const linkId = contactObj.linkedId || contactObj.id

  const allContacts = await Contact.findAll({
    where: {
      [Op.or] : [ { linkedId: linkId }, { id: linkId } ]
    }
  })

  // Select unique emails and phone nos. from grouped Set
  let emailSet   = new Set()
  let phoneSet  = new Set()
  let secondaryIdSet = new Set()
  await Promise.all(allContacts.map((contact) => {
      secondaryIdSet.add(contact.id)
      emailSet.add(contact.email)
      phoneSet.add(contact.phoneNumber)
  }))
  const emailList = [...emailSet].filter((item) => item !== null)
  const phoneList = [...phoneSet].filter((item) => item !== null)
  const secondaryIdList = [...secondaryIdSet].filter((id) => id !== linkId)

  const contactGroupObj = {
    primaryContactId: linkId,
    emails: emailList,
    phoneNumbers: phoneList,
    secondaryContactIds: secondaryIdList
  }
  return { contact: contactGroupObj }
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
    const phoneNumber = req.body.phoneNumber || null
    const email       = req.body.email       || null

    // TODO: Validate PhoneNo. email

    // Create Logic
    let result
    if(email !== null && phoneNumber !== null){
      const newContact = await Contact.unionCreate({phoneNumber: phoneNumber, email: email})
      result = await Contact.groupByLinkedId(newContact)
    }else if (phoneNumber !== null){
      const [ newContact, _ ] = await Contact.findOrCreate({
        where: { phoneNumber: phoneNumber },
        defaults: { phoneNumber: phoneNumber }
      })
      result = await Contact.groupByLinkedId(newContact)
    }else if(email !== null){
      const [ newContact, _ ] = await Contact.findOrCreate({
        where: { email: email },
        defaults: { email: email }
      })
      console.log(newContact)
      result = await Contact.groupByLinkedId(newContact)
    }else{
      return res.status(404).json({error: 'No contact details provided as neither email nor phoneNumber. was provided.' })
    }
    return res.status(201).json(result)
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
    console.error(req.body)
    const { phoneNumber, email, linkedId, linkedPrecedence } = req.body
    console.error(phoneNumber, email, linkedId, linkedPrecedence)
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

    contact.phoneNumber = phoneNumber || null
    contact.email = email || null
    contact.linkedId = linkedId || null
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
