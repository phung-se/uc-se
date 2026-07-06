// =============================================================================
// EECE/CS 3093C Software Engineering — Lab 3
// messengerdb.js — code skeleton provided by Phu Phung
// complete implementation by [Your Name]
// =============================================================================
const { MongoClient } = require('mongodb');
const uri = ".."; //replace this with your connection string
const client = new MongoClient(uri);

async function connect (){
  await client.connect();
  console.log('Debug>messengerdb.js: connected to MongoDB server!');
}

module.exports = { connect };
