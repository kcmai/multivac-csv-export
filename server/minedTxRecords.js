const fetch = require('cross-fetch')
const historicalPriceData = require('./historicalPriceData')

exports.exportMinedTxs = async (address, currency) => {
    const minedTxRecords = []

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
                    minedTxPromises.push(getMinedTxsFromPage(address, page, historicalPrices))
                }
            } else {
                for (let page = 1; page <= batchSize; page++) {
                    minedTxPromises.push(getMinedTxsFromPage(address, page + currPage, historicalPrices))
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
        totalRewards: minedTxRecords.length * 50.0
    }
}

async function getMinedTxsFromPage(address, page, historicalPrices) {
    const txs = []
    let response = null

    try {
        response = await fetchMinedRecordsResponse(address, page)
        const hashIds = JSON.parse(response)["data"]

        hashIds.forEach((element) => {
            const atTimePrice = historicalPriceData.findHistoricalPrice(historicalPrices, element["timestamp"])

            txs.push({
                timestamp: historicalPriceData.convertEpochToDate(element["timestamp"]),
                id: element["hash"],
                amount: (50.0).toFixed(8),
                price: atTimePrice.toFixed(8),
                totalValue: (50.0 * atTimePrice).toFixed(8)
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
        const response = await fetchMinedRecordsResponse(address, 1)
        maxPages = JSON.parse(response)["pages"]
        if (maxPages == 0) console.log("Address provided does not have any mined transaction records")
    } catch (error) {
        console.log(`Error retrieving mined transactions max page count for address: ${address}`)
    }
    return maxPages
}

async function fetchMinedRecordsResponse(address, pageNum) {
    let response = null

    try {
        response = await fetch("https://e.mtv.ac/block/listByMiner", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"Microsoft Edge\";v=\"95\", \"Chromium\";v=\"95\", \";Not A Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "Referer": `https://e.mtv.ac/account.html?address=${address}`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": `address=${address}&pageNum=${pageNum}&pageSize=256`,
            "method": "POST"
        })
    } catch (error) {
        console.log(`Error fetching mined records from MultiVAC endpoint`)
    }
    return await response.text()
}