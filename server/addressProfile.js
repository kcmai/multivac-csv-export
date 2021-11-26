const fetch = require('cross-fetch')

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

exports.getAddressProfileResponse = async (address) => {
    let response = null

    try {
        response = await fetch("https://e.mtv.ac/account/get", {
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
            "body": `address=${address}`,
            "method": "POST"
        })
    } catch (error) {
        console.log(`Error retreiving address profile for ${address}: ${error}`)
    }
    return await response.text()
}
