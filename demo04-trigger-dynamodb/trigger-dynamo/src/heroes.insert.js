const uuid = require('uuid')
const Joi = require('@hapi/joi')
const decoratorValidator = require('./util/decoratorValidator')
const globalEnum = require('./util/globalEnum')

class Handler {
  constructor({ dynamoDbSvc }) {
    this.dynamoDbSvc = dynamoDbSvc
    this.dynamodbTable = process.env.DYNAMODB_TABLE
  }

  static validator() {
    return Joi.object({
      nome: Joi.string().max(100).min(2).required(),
      poder: Joi.string().max(20).required()
    })
  }

  async insertItem(params) {
    return this.dynamoDbSvc.put(params).promise()
  }

  prepareDate(data) {
    return {
      TableName: this.dynamodbTable,
      Item: {
        ...data,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      }
    }
  }

  handlerSuccess(data) {
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    }
  }

  handlerError(data) {
    return {
      statusCode: data.statusCode || 501,
      headers: {'Content-Type': 'text/plain'},
      body: 'Couldn\'t create item!!'
    }
  }

  async main(event) {
    try {
      const data = event.body

      const dbParams = this.prepareDate(data)
      await this.insertItem(dbParams)

      return this.handlerSuccess(dbParams.Item)
    } catch (e) {
      console.error('Deu ruim**', e.stack)
      return this.handlerError({statusCode: 500})
    }
  }
}

//factory
const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()

const handler = new Handler({
  dynamoDbSvc: dynamoDB
})

module.exports = decoratorValidator(
  handler.main.bind(handler),
  Handler.validator(),
  globalEnum.ARG_TYPE.BODY)
