import sequelize from "./database.js" 
import { DataTypes, Op } from "sequelize"
 
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
  },
  { paranoid: true }
)

// Add Custom Methods

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


export default Contact
