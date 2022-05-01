const fetchUtil = require('./fetchUtil')
const historicalPriceData = require('./historicalPriceDataUtil')

exports.exportMinedTxs = async (address, currency) => {
    const minedTxRecords = []
    const rewardsPerBlock = 50.0

    try {
        const maxPages = await getMinedPageCount(address)
        const historicalPrices = await historicalPriceData.getHistoricalPrices(currency)
        const batchSize = 50
        let currPage = 0

        /* Creating promises through batches to be under request limit from server */
        while (currPage <= maxPages) {
            let minedTxPromises = []

            /* Gather remaining mined transactions from remaining pages left in batch */
            if (currPage + batchSize > maxPages) {
                for (let page = currPage + 1; page <= maxPages; page++) {
                    minedTxPromises.push(getMinedTxsFromPage(address, page, historicalPrices, currency))
                }
            } else {
                for (let page = 1; page <= batchSize; page++) {
                    minedTxPromises.push(getMinedTxsFromPage(address, page + currPage, historicalPrices, currency))
                }
            }

            const minedTxs = await Promise.all(minedTxPromises)
            minedTxs.forEach((pageOfTxs) => {
                Array.prototype.push.apply(minedTxRecords, pageOfTxs)
            })
            currPage += batchSize

            if (currPage > maxPages) { break }
        }
    } catch (error) {
        console.log(error)
    }
    return {
        minedTxRecords: minedTxRecords,
        totalRewards: minedTxRecords.length * rewardsPerBlock
    }
}

async function getMinedTxsFromPage(address, page, historicalPrices, currency) {
    const txs = []
    const rewardsPerBlock = 50.0
    let response = null

    try {
        response = await fetchUtil.fetchMinedRecordsResponse(address, page)
        const hashIds = JSON.parse(response)["data"]

        hashIds.forEach((element) => {
            const atTimePrice = historicalPriceData.findHistoricalPrice(historicalPrices, element["timestamp"])
            const emptyCsvColumn = ""

            txs.push({
                timestamp: historicalPriceData.convertEpochToDate(element["timestamp"]),
                sentAmount: emptyCsvColumn,
                sentCurrency: emptyCsvColumn,
                receivedAmount: (rewardsPerBlock).toFixed(8),
                receivedCurrency: "MTV",
                feeAmount: emptyCsvColumn,
                feeCurrency: emptyCsvColumn,
                netWorthAmount: (rewardsPerBlock * atTimePrice).toFixed(8),
                netWorthCurrency: currency,
                label: emptyCsvColumn,
                description: `From: ${address} To: ${address}`,
                txHash: element["hash"]
            })
        })
    } catch (error) {
        console.log(`Error retrieving mined transactions from: address: ${address}, page: ${page} error: ${error}`)
    }
    return txs
}

async function getMinedPageCount(address) {
    let maxPages = 0

    try {
        const response = await fetchUtil.fetchMinedRecordsResponse(address, 1)
        maxPages = JSON.parse(response)["pages"]
        if (maxPages == 0) console.log(`Address provided does not have any mined transaction records`)
    } catch (error) {
        console.log(`Error retrieving mined transactions max page count for address: ${address}`)
    }
    return maxPages
}