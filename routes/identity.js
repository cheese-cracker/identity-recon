import express from 'express'
import Contact from '../models/contact.js'
import validator from 'validator'

const identityRouter = express.Router()

const contactResultWrapper = async (contactGroup) => {
  let linkId = contactGroup[0].linkId || contactGroup[0].id

  // Select unique emails and phone nos. from grouped Set
  let emailSet = new Set()
  let phoneSet = new Set()
  let idSet = new Set()
  await Promise.all(
    contactGroup.map((contact) => {
      idSet.add(contact.id)
      emailSet.add(contact.email)
      phoneSet.add(contact.phoneNumber)
    })
  )
  const emailList = [...emailSet].filter((item) => item !== null)
  const phoneList = [...phoneSet].filter((item) => item !== null)
  const secondaryIdList = [...idSet].filter((id) => id !== linkId)

  // Construct result object
  const resultObj = {
    contact: {
      primaryContactId: linkId,
      emails: emailList,
      phoneNumbers: phoneList,
      secondaryContactIds: secondaryIdList
    }
  }
  console.error(resultObj)
  return resultObj
}

const retrievePhoneEmail = (req) => {
  try {
    const phoneNumber = req.body.phoneNumber || null
    const email = req.body.email || null

    // Validate Phone and Email
    if (phoneNumber !== null && !validator.isNumeric(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }
    if (email !== null && !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }
    return { phoneNumber, email }
  } catch (error) {
    console.error(req.body)
    console.error('Unable to retrieve proper email/phoneNumber from request:', error)
    res.status(400).json({ error: 'Failed to validate request body' })
  }
}

identityRouter.post('', async (req, res) => {
  try {
    const { phoneNumber, email } = retrievePhoneEmail(req)

    let contactGroup, newLinkedId
    if (email !== null && phoneNumber !== null) {
      const newContact = await Contact.unionCreate({ phoneNumber: phoneNumber, email: email })
      newLinkedId = newContact.linkedId || newContact.id
      contactGroup = await Contact.groupByLinkedId(newLinkedId)
    } else if (phoneNumber !== null) {
      const [newContact, _] = await Contact.findOrCreate({
        where: { phoneNumber: phoneNumber },
        defaults: { phoneNumber: phoneNumber }
      })
      newLinkedId = newContact.linkedId || newContact.id
      contactGroup = await Contact.groupByLinkedId(newLinkedId)
    } else if (email !== null) {
      const [newContact, _] = await Contact.findOrCreate({
        where: { email: email },
        defaults: { email: email }
      })
      newLinkedId = newContact.linkedId || newContact.id
      contactGroup = await Contact.groupByLinkedId(newLinkedId)
    } else {
      return res.status(404).json({
        error: 'No contact details provided as neither email nor phoneNumber found in request body.'
      })
    }

    const resultObj = await contactResultWrapper(contactGroup)
    return res.status(201).json(resultObj)
  } catch (error) {
    console.error('Error creating contact:', error)
    res.status(500).json({ error: 'Failed to create contact' })
  }
})

export default identityRouter
