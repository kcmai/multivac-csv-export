const express = require("express")
const app = express()
const server = require("http").createServer(app)
const cors = require("cors")
const queue = require("bull")
const webSocket = require("ws")
const addressProfile = require("./addressProfile")

const PORT = process.env.PORT || 3000
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379"
const generateRecordsQueue = new queue("generateRecords", REDIS_URL)

const wss = new webSocket.Server({ server: server })

app.use(cors())

app.get("/", (req, res) => res.send("Hello, if you would like to learn how to use the api, please visit https://github.com/kcmai/multivac-csv-export"))

wss.on("connection", async (ws) => {
  ws.on("message", async (message) => {
    let address = JSON.parse(message)["address"]
    let currency = JSON.parse(message)["currency"]
    let job = null

    /* Kick off a new job by adding it to the work queue */
    try {
      job = await generateRecordsQueue.add({
        address: address,
        currency: currency
      })
    } catch (error) {
      console.log(`Error adding job to queue for address: ${address}`)
    }

    /* Check to see if the job has finished. If there are a lot of records to be processed, Heroku
     * will close the connection after 30 seconds. The client will be pinged every n seconds to
     * ensure that the connection stay alives until the job completes.
     */
    let keepAlivePing = setInterval(() => {
      ws.ping("Generating report...")
    }, 15000)

    const txRecords = await job.finished()
    await job.remove()
    clearInterval(keepAlivePing)
    ws.send(JSON.stringify(txRecords))
  })
})

app.get("/checkIfValidAddress/:address", async (req, res) => {
  try {
    const addressProfileResponse = await addressProfile.getAddressProfileResponse(req.params.address)
    const stakeRank = JSON.parse(addressProfileResponse)["stake"]["rank"]

    if (stakeRank == 0) {
      throw `Address: ${req.params.address} does not exist`
    }
    res.send(JSON.stringify(stakeRank))
  } catch (error) {
    res.send(null)
  }
})

/* Kick off a new job by adding it to the work queue.  
 * Returns a job id that can be used to poll when records are done processing
 */
app.get("/addGenerateRecordJob/:address/:currency", async (req, res) => {
  try {
    let job = await generateRecordsQueue.add({
      address: req.params.address,
      currency: req.params.currency
    })
    res.send(job.id)
  } catch (error) {
    res.status(400).send({ message: `Error adding job to queue for address: ${req.params.address} ${error}` })
  }
})

/* Client will need to poll if the job has been finished every n seconds
 * using their unique job id
 *
 * (Reason: Heroku has a max request timeout of 30 seconds and some jobs may
 * take longer due to more records) 
 *
 * If you would like a websocket approach, please refer above.
 *
 */
app.get("/checkOnJobProgress/:jobId", async (req, res) => {
  try {
    let job = await generateRecordsQueue.getJob(req.params.jobId)

    if (!job) {
      throw `Job: ${req.params.jobId} was found.`
    }

    if (await job.getState() == "completed") {
      const txRecords = await job.finished()
      await job.remove()
      return res.send(txRecords)
    }
  } catch (error) {
    return res.status(404).send({ message: `Job: ${req.params.jobId} was not found.` })
  }
  res.status(202).send({ message: `Job: ${req.params.jobId} is still processing.` })
})

server.listen(PORT, () => console.log(`Lisening on port: ${PORT}`))