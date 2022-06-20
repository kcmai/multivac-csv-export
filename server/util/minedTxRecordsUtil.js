const fetchUtil = require('./fetchUtil')
const historicalPriceData = require('./historicalPriceDataUtil')

exports.exportMinedTxs = async (address, currency) => {
    const rewardTxs = []
    let totalRewards = 0

    try {
        const maxPages = await getMinedPageCount(address)
        const historicalPrices = await historicalPriceData.getHistoricalPrices(currency)

        let txsPromises = []
        for (let page = 1; page <= maxPages; page++) {
            txsPromises.push(getMinedTxsFromPage(address, page, historicalPrices, currency))
        }

        const txs = await Promise.all(txsPromises)
        txs.forEach((pageOfTxs) => {
            Array.prototype.push.apply(rewardTxs, pageOfTxs.rewardTxs)
            totalRewards += pageOfTxs.rewardsForPage
        })
    } catch (error) {
        console.log(error)
    }
    return {
        minedTxRecords: rewardTxs,
        totalRewards: totalRewards
    }
}

async function getMinedTxsFromPage(address, page, historicalPrices, currency) {
    const rewardTxs = []
    let response = null
    let rewardTotal = 0

    try {
        response = await fetchUtil.fetchMinedRecordsResponse(address, page)
        const hashIds = JSON.parse(response)["data"]

        hashIds.forEach((element) => {
            const atTimePrice = historicalPriceData.findHistoricalPrice(historicalPrices, element["timestamp"])
            const emptyCsvColumn = ""
            // Halvening of rewards from block 10 million onward
            const rewardsPerBlock = element["id"] >= 10000000 ? 25 : 50

            rewardTxs.push({
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
            rewardTotal += rewardsPerBlock
        })
    } catch (error) {
        console.log(`Error retrieving mined transactions from: address: ${address}, page: ${page} error: ${error}`)
    }
    return {
        rewardTxs: rewardTxs,
        rewardsForPage: rewardTotal
    }
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