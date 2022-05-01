const fetchUtil = require('./fetchUtil')
const historicalPriceData = require('./historicalPriceDataUtil')

exports.exportAddressTxs = async (address, currency) => {
    const rewardTxs = []
    const mainnetTxs = []
    let totalRewards = 0

    try {
        const maxPages = await getTxsPageCount(address)
        const historicalPrices = await historicalPriceData.getHistoricalPrices(currency)

        let txsPromises = []
        for (let page = 1; page <= maxPages; page++) {
            txsPromises.push(getTxsFromPage(address, page, historicalPrices, currency))
        }

        const txs = await Promise.all(txsPromises)
        txs.forEach((pageOfTxs) => {
            Array.prototype.push.apply(rewardTxs, pageOfTxs.rewardTxs)
            Array.prototype.push.apply(mainnetTxs, pageOfTxs.mainnetTxs)
            totalRewards += pageOfTxs.rewardsForPage
        })
    } catch (error) {
        console.log(error)
    }
    return {
        rewardTxs: rewardTxs,
        mainnetTxs: mainnetTxs,
        totalRewards: totalRewards
    }
}

async function getTxsFromPage(address, page, historicalPrices, currency) {
    const rewardTxs = []
    const mainnetTxs = []
    let rewardTotal = 0

    try {
        const milestoneRewardDistributorAddress = "0x0000990fb91744c8ecdbf24ab392153a13cae040"
        const blockDistributorAddress = "0x00000df3e3e1f1b1212b8bdb8896df4442f13a4c"
        const addressTxsResponse = await fetchUtil.fetchTxRecordsResponse(address, page)
        const addressTxsHashIds = JSON.parse(addressTxsResponse)["data"]

        addressTxsHashIds.forEach((element) => {
            const atTimePrice = historicalPriceData.findHistoricalPrice(historicalPrices, element["timestamp"])
            const amount = element["value"] / 1e18
            const emptyCsvColumn = ""

            if (element["to"] == address && (element["from"] == blockDistributorAddress || element["from"] == milestoneRewardDistributorAddress)) {
                rewardTxs.push({
                    timestamp: historicalPriceData.convertEpochToDate(element["timestamp"]),
                    sentAmount: emptyCsvColumn,
                    sentCurrency: emptyCsvColumn,
                    receivedAmount: amount.toFixed(8),
                    receivedCurrency: "MTV",
                    feeAmount: emptyCsvColumn,
                    feeCurrency: emptyCsvColumn,
                    netWorthAmount: (amount * atTimePrice).toFixed(8),
                    netWorthCurrency: currency,
                    label: emptyCsvColumn,
                    description: `From: ${element["from"]} To: ${element["to"]}`,
                    txHash: element["hash"]
                })
                rewardTotal += amount
            } else {
                mainnetTxs.push({
                    timestamp: historicalPriceData.convertEpochToDate(element["timestamp"]),
                    sentAmount: element["from"] == address ? amount.toFixed(8) : emptyCsvColumn,
                    sentCurrency: element["from"] == address ? "MTV" : emptyCsvColumn,
                    receivedAmount: element["from"] != address ? amount.toFixed(8) : emptyCsvColumn,
                    receivedCurrency: element["from"] != address ? "MTV" : emptyCsvColumn,
                    feeAmount: emptyCsvColumn,
                    feeCurrency: "MTV",
                    netWorthAmount: (amount * atTimePrice).toFixed(8),
                    netWorthCurrency: currency,
                    label: emptyCsvColumn,
                    description: element["status"] == 1 ? `SUCCESS - From: ${element["from"]} To: ${element["to"]}` : `FAILED - From: ${element["from"]} To: ${element["to"]}`,
                    txHash: element["hash"]
                })
            }
        })
    } catch (error) {
        console.log(`Error retrieving transactions from: address: ${address}, page: ${page} error: ${error}`)
    }
    return {
        rewardTxs: rewardTxs,
        mainnetTxs: mainnetTxs,
        rewardsForPage: rewardTotal
    }
}

async function getTxsPageCount(address) {
    let maxPages = 0

    try {
        const response = await fetchUtil.fetchTxRecordsResponse(address, 1)
        maxPages = JSON.parse(response)["pages"]
        if (maxPages == 0) console.log(`Address provided does not have any transaction records`)
    } catch (error) {
        console.log(`Error retrieving transactions max page count for address: ${address}, error:${error}`)
    }
    return maxPages
}