const throng = require("throng")
const queue = require("bull")
const minedTxRecordsUtil = require("./util/minedTxRecordsUtil")
const addressTxRecordsUtil = require("./util/addressTxRecordsUtil")
const fetchUtil = require('./util/fetchUtil')

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379"

/* Spin up multiple processes to handle jobs to take advantage of more CPU cores */
const workers = process.env.WEB_CONCURRENCY || 2

/* The maximum number of jobs each worker should process at once. This will need
 * to be tuned for your application. If each job is mostly waiting on network 
 * responses it can be much higher. If each job is CPU-intensive, it might need
 * to be much lower. 
 */
const maxJobsPerWorker = 50

function start() {
  const generateRecordsQueue = new queue("generateRecords", REDIS_URL)

  generateRecordsQueue.process(maxJobsPerWorker, async (job) => {
    try {
      const addressTxResponse = await addressTxRecordsUtil.exportAddressTxs(job.data.address, job.data.currency)
      const minedTxsResponse = await minedTxRecordsUtil.exportMinedTxs(job.data.address, job.data.currency)
      let addressProfileResponse = await fetchUtil.getAddressProfile(job.data.address)

      addressProfileResponse["receivedRewardAmount"] = parseFloat((addressTxResponse.totalRewards + minedTxsResponse.totalRewards).toFixed(2)).toLocaleString()
      Array.prototype.push.apply(addressTxResponse.rewardTxs, minedTxsResponse.minedTxRecords)

      return {
        "addressProfile": addressProfileResponse,
        "rewardTxs": addressTxResponse.rewardTxs,
        "mainnetTxs": addressTxResponse.mainnetTxs
      }
    } catch (error) {
      console.log(`Error generating records for: ${req.params.address}`)
    }
    return null
  })
}

/* Initialize the clustered worker process */
throng({ workers, start })