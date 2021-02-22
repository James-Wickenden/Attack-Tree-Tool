const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .get('/', (req, res) => {
    console.log("Loading main...")
    res.sendFile(path.join(__dirname, 'public/main.html'))
  })
  .get('/tree', (req, res) => {
    console.log("Loading tree...")
    res.sendFile(path.join(__dirname, 'public/tree.html'))
  })
  .get('/version1', (req, res) => {
    console.log("Loading UI Version 1: Adjustable windows...")
    res.sendFile(path.join(__dirname, 'public/version1.html'))
  })
  .get('/version2', (req, res) => {
    console.log("Loading UI Version 2: Separate tabs...")
    res.sendFile(path.join(__dirname, 'public/version2.html'))
  })
  .get('/editor1', (req, res) => {
    console.log("Loading graph editor A...")
    res.sendFile(path.join(__dirname, 'public/editor1.html'))
  })
  .get('/editor2', (req, res) => {
    console.log("Loading graph editor B...")
    res.sendFile(path.join(__dirname, 'public/editor2.html'))
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
