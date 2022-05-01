const fetchUtil = require('./fetchUtil')
const moment = require('moment')

/* Returns an array of hourly data price points from current date to the start of staking */
exports.getHistoricalPrices = async (currency) => {
  const retrievedPrices = []

  try {
    const stakingStartEpoch = 1617282000
    const currentEpoch = (Date.now() / 1000)

    let timeFrames = splitTimeRanges(stakingStartEpoch, currentEpoch)
    for (let i = 0; i < timeFrames.length; i++) {
      const historicalDataResponse = await fetchUtil.getHistoricalDataResponse(timeFrames[i][0], timeFrames[i][1], currency)
      const prices = JSON.parse(historicalDataResponse)["prices"]
      Array.prototype.push.apply(retrievedPrices, prices)
    }
  } catch (error) {
    console.log("Failed to retrieve historical price data: " + error)
  }
  return retrievedPrices
}

/* Coingecko api has preset auto data granularity from query time
*  1-90 days => hourly data points
*  >90 days => daily data points
*/
function splitTimeRanges(start, current) {
  const range = (current - start)
  const granularity = 2.9
  const monthsToSec = 2592000 * granularity
  const times = []

  let increment = monthsToSec
  while (increment < range) {
    times.push([start, start + monthsToSec])
    start = start + monthsToSec

    if ((increment + monthsToSec) > range) {
      times.push([start, current])
      break
    }
    increment += monthsToSec
  }
  return times
}

/* Coingecko returns an array of sorted points by date. If the given timestamp is 
*  in between two data points, the avaerage price between the two will be returned
*/
exports.findHistoricalPrice = (sortedArray, timestamp) => {
  const epoch = timestamp * 1000
  let start = 0
  let end = sortedArray.length - 1

  while (start <= end) {
    let middle = Math.floor((start + end) / 2)

    if (middle + 1 > sortedArray.length - 1) return sortedArray[middle][1]

    if (epoch >= sortedArray[middle][0] && epoch <= sortedArray[middle + 1][0]) {
      return (sortedArray[middle][1] + sortedArray[middle + 1][1]) / 2
    } else if (epoch > sortedArray[middle][0]) {
      start = middle + 1
    } else {
      end = middle - 1
    }
  }
  return -1
}

exports.convertEpochToDate = (timeEpoch) => {
  return moment.utc(timeEpoch * 1000).format("YYYY-MM-DD HH:mm:ss").toString()
}