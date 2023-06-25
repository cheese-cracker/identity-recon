import express from "express"
import Contact from "../models/contact.js"

const identityRouter = express.Router()

identityRouter.post('', async (req, res) => {
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

export default identityRouter
