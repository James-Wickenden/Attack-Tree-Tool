const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .get('/', (req, res) => {
    console.log("Loading main...")
    res.sendFile(path.join(__dirname, 'public/main.html'))
  })
  .get('/mxgraph_test_1', (req, res) => {
    console.log("Loading test mxgraph model 1...")
    res.sendFile(path.join(__dirname, 'public/mxgraph_test_1.html'))
  })
  .get('/mxgraph_test_2', (req, res) => {
    console.log("Loading test mxgraph model 2...")
    res.sendFile(path.join(__dirname, 'public/mxgraph_test_2.html'))
  })
  .get('/editor1', (req, res) => {
    console.log("Loading graph editor A...")
    res.sendFile(path.join(__dirname, 'public/editor1.html'))
  })
  .get('/editor2', (req, res) => {
    console.log("Loading graph editor B...")
    res.sendFile(path.join(__dirname, 'public/editor2.html'))
  })
  .get('/tree_builder', (req, res) => {
    console.log("Loading tree builder...")
    res.sendFile(path.join(__dirname, 'public/tree_builder.html'))
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
