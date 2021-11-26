const historicalPriceData = require('./historicalPriceData')
const fetch = require('cross-fetch')

exports.exportAddressTxs = async (address, currency) => {
    const txRecords = []
    let totalRewards = 0

    try {
        const maxPages = await getTxsPageCount(address)
        const historicalPrices = await historicalPriceData.getHistoricalPrices(currency)

        let txsPromises = []
        for (let page = 1; page <= maxPages; page++) {
            txsPromises.push(getTxsFromPage(address, page, historicalPrices))
        }

        const txs = await Promise.all(txsPromises)
        txs.forEach((pageOfTxs) => {
            Array.prototype.push.apply(txRecords, pageOfTxs.txRecords)
            totalRewards += pageOfTxs.rewardsForPage
        })
    } catch (error) {
        console.log(error)
    }
    return {
        txRecords: txRecords,
        totalRewards: totalRewards
    }
}

async function getTxsFromPage(address, page, historicalPrices) {
    const txs = []
    let rewardTotal = 0

    try {
        const milestoneRewardDistributorAddress = "0x0000990fb91744c8ecdbf24ab392153a13cae040"
        const blockDistributorAddress = "0x00000df3e3e1f1b1212b8bdb8896df4442f13a4c"
        const response = await fetchTxRecordsResponse(address, page)
        const hashIds = JSON.parse(response)["data"]

        hashIds.forEach((element) => {
            if (element["to"] == address && (element["from"] == blockDistributorAddress || element["from"] == milestoneRewardDistributorAddress)) {

                const atTimePrice = historicalPriceData.findHistoricalPrice(historicalPrices, element["timestamp"])
                const amount = element["value"] / 1e18

                txs.push({
                    timestamp: historicalPriceData.convertEpochToDate(element["timestamp"]),
                    id: element["id"],
                    amount: amount.toFixed(8),
                    price: atTimePrice.toFixed(8),
                    totalValue: (amount * atTimePrice).toFixed(8)
                })
                rewardTotal += amount
            }
        })
    } catch (error) {
        console.log(`Error retrieving transactions from: address: ${address}, page: ${page} error: ${error}`)
    }
    return {
        txRecords: txs,
        rewardsForPage: rewardTotal
    }
}

async function getTxsPageCount(address) {
    let maxPages = 0

    try {
        const response = await fetchTxRecordsResponse(address, 1)
        maxPages = JSON.parse(response)["pages"]
        if (maxPages == 0) console.log("Address provided does not have any transaction records")
    } catch (error) {
        console.log(`Error retrieving transactions max page count for address: ${address}, error:${error}`)
    }
    return maxPages
}

async function fetchTxRecordsResponse(address, pageNum) {
    let response = null

    try {
        response = await fetch("https://e.mtv.ac/transaction/list", {
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
            "body": `pageNum=${pageNum}&pageSize=256&number=&address=${address}`,
            "method": "POST"
        })
    } catch (error) {
        console.log(`Error fetching mined records from MultiVAC endpoint: ${error}`)
    }
    return await response.text()
}