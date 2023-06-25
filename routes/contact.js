import express from "express"
import Contact from "../models/contact.js"

const contactRouter = express.Router()

contactRouter.get('', async (req, res) => {
  try {
    const contacts = await Contact.findAll()
    return res.json(contacts)
  } catch (error) {
    console.error('Error retrieving contacts:', error)
    return res.status(500).json({ error: 'Failed to retrieve contacts' })
  }
})

contactRouter.post('', async (req, res) => {
  try {
    console.error(req.body)
    const { phoneNumber, email, linkedId, linkedPrecedence } = req.body
    console.error(phoneNumber, email, linkedId, linkedPrecedence)
    const contact = await Contact.create({ phoneNumber, email, linkedId, linkedPrecedence })
    return res.status(201).json(contact)
  } catch (error) {
    console.error('Error retrieving contacts:', error)
    return res.status(500).json({ error: 'Failed to retrieve contacts' })
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

    return res.json(contact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return res.status(500).json({ error: 'Failed to update contact' })
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
    return res.sendStatus(204)

  } catch (error) {
    console.error('Error deleting contact:', error)
    return res.status(500).json({ error: 'Failed to delete contact' })
  }
})

export default contactRouter
