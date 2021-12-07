# MultiVAC CSV Export

An application that exports the stake rewards of a given address in CSV format.

# Website
https://multivac-csv-export.vercel.app/

#  Accessing API

Deployed Server Location: Heroku

Heroku has a limit of 30 seconds for a request to be fulfilled before being terminated automatically. Due to this, there are two methods to retrieve data from the API using WebSockets or REST. WebSockets will keep the connection alive by sending a ping every 15 seconds. REST will submit a job request and poll the endpoint every n seconds to see if the job has been completed.

## WebSockets

```
  const socket = new WebSocket("ws://multivac-csv-export.herokuapp.com")
  
  socket.onopen = () => {
    socket.send(JSON.stringify({
      "address": <address>,
      "currency": <currency>
    }))
  }
  
  socket.addEventListener("message", (event,) => {
    console.log("Message from server: ", JSON.parse(event.data))
    const addressProfile = JSON.parse(event.data)["addressProfile"]
    const txRecords = JSON.parse(event.data)["txRecords"]
    socket.close()
  })
```
## REST

```
  let jobResponse = null
  const jobId = await fetch("https://multivac-csv-export.herokuapp.com/addGenerateRecordJob/<address>/<currency>")
	
  while (!jobResponse) {
    jobResponse = await fetch("https://multivac-csv-export.herokuapp.com/checkOnJobProgress/<jobId>")
  }
    
  const addressProfile = JSON.parse(jobResponse)["addressProfile"]
  const txRecords = JSON.parse(jobResponse)["txRecords"]
```

# Notes

All data prices are retrieved from CoinGecko with an hourly data granularity. Please verify that the prices are accurate enough to fit your needs. 

This project is not affiliated with MultiVAC. The official site can be found at https://e.mtv.ac and their explorer https://e.mtv.ac/index.html.
