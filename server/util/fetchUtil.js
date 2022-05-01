const fetch = require('cross-fetch')

exports.getHistoricalDataResponse = async (start, end, currency) => {
    let response = null
    try {
        response = await fetch(`https://api.coingecko.com/api/v3/coins/multivac/market_chart/range?vs_currency=${currency}&from=${start}&to=${end}`)
    } catch (error) {
        console.log(`Error fetching price data from CoinGecko: ${error}`)

    }
    return await response.text()
}

exports.fetchTxRecordsResponse = async (address, pageNum) => {
    let response = null
    try {
        response = await fetch(`https://e.mtv.ac/transaction/list?address=${address}&pageNum=${pageNum}&pageSize=3000`)
    } catch (error) {
        console.log(`Error fetching mined records from MultiVAC endpoint: ${error}`)
    }
    return await response.text()
}

exports.fetchMinedRecordsResponse = async (address, pageNum) => {
    let response = null
    try {
        response = await fetch(`https://e.mtv.ac/block/listByMiner?address=${address}&pageNum=${pageNum}&pageSize=3000`)
    } catch (error) {
        console.log(`Error fetching mined records from MultiVAC endpoint: ${error}`)
    }
    return await response.text()
}


exports.getAddressProfileResponse = async (address) => {
    let response = null
    try {
        response = await fetch(`https://e.mtv.ac/account/get?address=${address}`)
    } catch (error) {
        console.log(`Error retreiving address profile for ${address}: ${error}`)
    }
    return await response.text()
}

exports.getAddressProfile = async (address) => {
    const addressProfileResponse = await exports.getAddressProfileResponse(address)
    const addressObj = JSON.parse(addressProfileResponse)
    const stakeRank = addressObj["stake"]["rank"]
    const totalStaked = addressObj["stake"]["totals"] / 1e18
    const mainnetBalance = addressObj["balance"] / 1e18
    const pendingWithdrawal = addressObj["stake"]["withdrawPending"] / 1e18

    return {
        address: address,
        stakeRank: stakeRank.toLocaleString(),
        totalStaked: parseFloat(totalStaked.toFixed(2)).toLocaleString(),
        mainnetBalance: parseFloat(mainnetBalance.toFixed(2)).toLocaleString(),
        pendingWithdrawal: parseFloat(pendingWithdrawal.toFixed(2).toLocaleString()).toLocaleString(),
    }
}