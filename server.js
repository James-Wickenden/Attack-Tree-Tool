const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .get('/', (req, res) => {
    console.log("Loading main...")
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
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
